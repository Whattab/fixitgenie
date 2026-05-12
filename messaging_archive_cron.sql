-- =============================================================================
-- messaging_archive_cron.sql
-- Phase 7: Auto-archive conversations 30 days after job completion.
--
-- PREREQUISITES (do these BEFORE running this file):
--   1. Enable the pg_cron extension in Supabase:
--        Dashboard → Database → Extensions → search "pg_cron" → toggle On
--      pg_cron runs as a background worker inside Postgres; without it the
--      cron.schedule() call at the bottom of this file will fail with
--      "schema 'cron' does not exist".
--
-- IDEMPOTENT: This file is safe to run multiple times.
--   - The function uses CREATE OR REPLACE.
--   - The cron job is unscheduled (if it exists) then re-created.
--   - The system-message insert is guarded by a NOT EXISTS check.
-- =============================================================================


-- =============================================================================
-- 1. Archive function
-- =============================================================================
create or replace function archive_old_completed_conversations()
returns void
language plpgsql
security definer          -- runs as postgres role; bypasses RLS
set search_path = public  -- pin search_path to avoid privilege-escalation
as $$
declare
  conv record;
begin
  -- Loop over every conversation whose parent request has been completed for
  -- more than 30 days and that still hasn't been fully archived by both parties.
  for conv in
    select c.id          as conv_id,
           c.homeowner_id,
           c.pro_id
    from   conversations c
    join   service_requests sr on sr.id = c.request_id
    where  sr.status        = 'completed'
      and  sr.completed_at  < now() - interval '30 days'
      and  (c.homeowner_archived = false or c.pro_archived = false)
  loop

    -- Archive for both parties in one update.
    update conversations
    set    homeowner_archived = true,
           pro_archived       = true
    where  id = conv.conv_id;

    -- Insert the system message only if it hasn't already been inserted
    -- (guards against duplicate messages when the function is re-run).
    insert into messages (conversation_id, sender_id, kind, body)
    select conv.conv_id,
           conv.homeowner_id,   -- placeholder sender; system msgs hide names
           'system',
           'Conversation archived — 30 days after job completion.'
    where not exists (
      select 1
      from   messages m
      where  m.conversation_id = conv.conv_id
        and  m.kind            = 'system'
        and  m.body            = 'Conversation archived — 30 days after job completion.'
    );

  end loop;
end;
$$;


-- =============================================================================
-- 2. Schedule via pg_cron
--
-- Unschedule any existing job with this name first so re-running this file
-- replaces rather than duplicates it. The DO block swallows the "job not
-- found" error that pg_cron raises on first run.
-- =============================================================================
do $$
begin
  perform cron.unschedule('archive-old-conversations');
exception
  when others then
    -- Job did not exist yet — safe to ignore.
    null;
end;
$$;

select cron.schedule(
  'archive-old-conversations',   -- job name (unique)
  '0 3 * * *',                   -- daily at 03:00 server time (UTC)
  'select archive_old_completed_conversations();'
);


-- =============================================================================
-- 3. Quick sanity queries (run these in SQL Editor after applying the file)
-- =============================================================================

-- Confirm the function was created:
--   select proname from pg_proc
--    where proname = 'archive_old_completed_conversations';

-- Confirm the cron job is scheduled:
--   select jobname, schedule, command from cron.job
--    where jobname = 'archive-old-conversations';


-- =============================================================================
-- 4. Manual test (no waiting 30 days)
-- =============================================================================

-- Step 1: Set a test conversation's request to "completed" 31 days ago:
--   update service_requests
--      set status = 'completed',
--          completed_at = now() - interval '31 days'
--    where id = <your test request id>;

-- Step 2: Run the archive function immediately:
--   select archive_old_completed_conversations();

-- Step 3: Verify the conversation was archived and the system message inserted:
--   select homeowner_archived, pro_archived from conversations
--    where request_id = <your test request id>;
--
--   select kind, body, created_at from messages
--    where conversation_id = (
--      select id from conversations where request_id = <your test request id>
--    )
--    order by created_at;

-- Step 4: Run again — should be a no-op (no duplicate system message):
--   select archive_old_completed_conversations();

-- Step 5 (cleanup — optional): revert the test data:
--   update service_requests
--      set status = 'assigned', completed_at = null
--    where id = <your test request id>;
--
--   update conversations
--      set homeowner_archived = false, pro_archived = false
--    where request_id = <your test request id>;
--
--   delete from messages
--    where conversation_id = (
--      select id from conversations where request_id = <your test request id>
--    )
--      and kind = 'system'
--      and body = 'Conversation archived — 30 days after job completion.';
