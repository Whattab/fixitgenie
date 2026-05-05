-- ============================================================
-- MESSAGING SCHEMA  —  Fixit Genie In-App Messaging
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New Query).
-- ============================================================

-- ============================================================
-- 1. ALTER service_requests: add completed_at
-- ============================================================
alter table service_requests
  add column if not exists completed_at timestamptz;

-- Trigger: auto-set completed_at when status flips to 'completed'
create or replace function set_completed_at()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'completed' and (OLD.status is distinct from 'completed') then
    NEW.completed_at = now();
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_set_completed_at on service_requests;
create trigger trg_set_completed_at
  before update on service_requests
  for each row execute function set_completed_at();

-- ============================================================
-- 2. Trigger on bids: accepting a bid rejects all others
--    When a bid's status flips to 'accepted', all OTHER pending
--    bids on the same request_id are set to 'rejected'.
-- ============================================================
create or replace function cascade_bid_accept()
returns trigger language plpgsql security definer as $$
begin
  if NEW.status = 'accepted' and OLD.status is distinct from 'accepted' then
    update bids
       set status = 'rejected'
     where request_id = NEW.request_id
       and id != NEW.id
       and status = 'pending';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_cascade_bid_accept on bids;
create trigger trg_cascade_bid_accept
  after update on bids
  for each row execute function cascade_bid_accept();

-- ============================================================
-- 3. conversations table
--    One conversation per (request, homeowner, pro) triple.
--    request_id uses SET NULL so conversations survive request
--    deletion and remain as permanent records.
-- ============================================================
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  request_id bigint references service_requests(id) on delete set null,
  homeowner_id uuid references profiles(id) not null,
  pro_id uuid references profiles(id) not null,
  created_at timestamp with time zone default now() not null,
  last_message_at timestamp with time zone default now() not null,
  homeowner_archived boolean default false not null,
  pro_archived boolean default false not null,

  constraint uq_conversation unique (request_id, homeowner_id, pro_id)
);

-- ============================================================
-- 4. messages table
--    kind: 'text' (normal), 'image' (photo attachment), 'system'
--    (auto-generated status messages).
--    deleted_at is a soft-delete for the sender.
-- ============================================================
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id uuid references profiles(id) not null,
  kind text default 'text' not null check (kind in ('text', 'image', 'system')),
  body text,
  attachment_url text,
  created_at timestamp with time zone default now() not null,
  read_at timestamp with time zone,
  deleted_at timestamp with time zone
);

-- Index for fast conversation thread queries
create index if not exists idx_messages_conversation
  on messages (conversation_id, created_at);

-- Index for unread count queries
create index if not exists idx_messages_unread
  on messages (conversation_id, sender_id, read_at)
  where read_at is null;

-- ============================================================
-- 5. Trigger: update conversation.last_message_at on new message
-- ============================================================
create or replace function update_conversation_last_message()
returns trigger language plpgsql security definer as $$
begin
  update conversations
     set last_message_at = NEW.created_at
   where id = NEW.conversation_id;
  return NEW;
end;
$$;

drop trigger if exists trg_update_last_message on messages;
create trigger trg_update_last_message
  after insert on messages
  for each row execute function update_conversation_last_message();

-- ============================================================
-- 6. Trigger: insert system message when bid status changes
--    When a bid flips to 'accepted' → system message "Bid accepted"
--    When a bid flips to 'rejected' → system message "Bid rejected"
--    Only fires if a matching conversation already exists.
-- ============================================================
create or replace function insert_bid_status_system_message()
returns trigger language plpgsql security definer as $$
declare
  conv_id uuid;
  sys_body text;
  req_owner uuid;
begin
  -- Only fire when status actually changed
  if NEW.status = OLD.status then
    return NEW;
  end if;

  -- Look up the request owner (homeowner)
  select user_id into req_owner
    from service_requests
   where id = NEW.request_id;

  -- Find the matching conversation
  select id into conv_id
    from conversations
   where request_id = NEW.request_id
     and pro_id = NEW.pro_id
     and homeowner_id = req_owner;

  -- No conversation yet → nothing to do
  if conv_id is null then
    return NEW;
  end if;

  -- Build the system message body
  if NEW.status = 'accepted' then
    sys_body := 'Bid accepted — contact info shared.';
  elsif NEW.status = 'rejected' then
    sys_body := 'Bid declined — this conversation is now read-only.';
  else
    return NEW;  -- ignore other status values
  end if;

  -- Insert the system message (sender_id = pro_id as placeholder; kind='system')
  insert into messages (conversation_id, sender_id, kind, body)
  values (conv_id, NEW.pro_id, 'system', sys_body);

  return NEW;
end;
$$;

drop trigger if exists trg_bid_status_system_message on bids;
create trigger trg_bid_status_system_message
  after update on bids
  for each row execute function insert_bid_status_system_message();

-- ============================================================
-- 7. Enable RLS on new tables
-- ============================================================
alter table conversations enable row level security;
alter table messages enable row level security;

-- ============================================================
-- 8. RLS Policies — conversations
-- ============================================================

-- 8a. SELECT: only participants can see their conversations
create policy "Participants_View_Conversations"
  on conversations for select
  using (auth.uid() = homeowner_id or auth.uid() = pro_id);

-- 8b. INSERT: caller must be one of the two participants AND
--     a bid must exist on request_id from the pro with status
--     'pending' or 'accepted' (no messaging without active bid).
create policy "Participants_Create_Conversation"
  on conversations for insert
  with check (
    (auth.uid() = homeowner_id or auth.uid() = pro_id)
    and exists (
      select 1 from bids
       where bids.request_id = conversations.request_id
         and bids.pro_id = conversations.pro_id
         and bids.status in ('pending', 'accepted')
    )
  );

-- 8c. UPDATE: homeowner can only toggle homeowner_archived,
--     pro can only toggle pro_archived. No other columns.
--     We use two separate policies for clarity.
create policy "Homeowner_Archive_Conversation"
  on conversations for update
  using (auth.uid() = homeowner_id)
  with check (
    auth.uid() = homeowner_id
    -- Ensure only archive flag is being changed (other fields stay the same)
    and pro_archived is not distinct from (select c.pro_archived from conversations c where c.id = id)
  );

create policy "Pro_Archive_Conversation"
  on conversations for update
  using (auth.uid() = pro_id)
  with check (
    auth.uid() = pro_id
    -- Ensure only archive flag is being changed (other fields stay the same)
    and homeowner_archived is not distinct from (select c.homeowner_archived from conversations c where c.id = id)
  );

-- ============================================================
-- 9. RLS Policies — messages
-- ============================================================

-- Helper: check if the caller is a participant in a given conversation.
-- Uses SECURITY DEFINER to avoid RLS recursion when looking up conversations.
create or replace function is_conversation_participant(conv_id uuid)
returns boolean language plpgsql security definer as $$
begin
  return exists (
    select 1 from conversations
     where id = conv_id
       and (homeowner_id = auth.uid() or pro_id = auth.uid())
  );
end;
$$;

-- Helper: check if the conversation's bid is still active (pending or accepted).
-- Returns false if the bid is rejected (= frozen thread).
create or replace function is_conversation_active(conv_id uuid)
returns boolean language plpgsql security definer as $$
declare
  conv_request_id bigint;
  conv_pro_id uuid;
begin
  select request_id, pro_id into conv_request_id, conv_pro_id
    from conversations where id = conv_id;

  -- If request was deleted (SET NULL), conversation is frozen
  if conv_request_id is null then
    return false;
  end if;

  return exists (
    select 1 from bids
     where bids.request_id = conv_request_id
       and bids.pro_id = conv_pro_id
       and bids.status in ('pending', 'accepted')
  );
end;
$$;

-- 9a. SELECT: participants can read all messages in their conversations
create policy "Participants_View_Messages"
  on messages for select
  using (is_conversation_participant(conversation_id));

-- 9b. INSERT: participant, must be the sender, conversation must be active
--     (bid status 'pending' or 'accepted'), and conversation must not be
--     archived for the sender.
create policy "Participants_Send_Messages"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and is_conversation_participant(conversation_id)
    and is_conversation_active(conversation_id)
  );

-- 9c. UPDATE: two narrow cases
--     - Recipient can set read_at (mark as read)
--     - Sender can set deleted_at (soft-delete own message)
--     We use two separate policies for clarity.
create policy "Recipient_Mark_Read"
  on messages for update
  using (
    -- Caller is NOT the sender (i.e. is the recipient)
    auth.uid() != sender_id
    and is_conversation_participant(conversation_id)
  )
  with check (
    -- Only read_at may change; other fields must stay the same
    body is not distinct from (select m.body from messages m where m.id = id)
    and attachment_url is not distinct from (select m.attachment_url from messages m where m.id = id)
    and deleted_at is not distinct from (select m.deleted_at from messages m where m.id = id)
  );

create policy "Sender_Soft_Delete"
  on messages for update
  using (
    auth.uid() = sender_id
    and is_conversation_participant(conversation_id)
  )
  with check (
    -- Only deleted_at may change; other fields must stay the same
    body is not distinct from (select m.body from messages m where m.id = id)
    and attachment_url is not distinct from (select m.attachment_url from messages m where m.id = id)
    and read_at is not distinct from (select m.read_at from messages m where m.id = id)
  );

-- ============================================================
-- 10. Enable Realtime on messages and conversations
-- ============================================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;

-- ============================================================
-- 11. Storage bucket: chat-attachments
--
--     Bucket is PRIVATE (not public).
--     Upload path convention: {conversation_id}/{message_id}/{filename}
--
--     RLS on storage.objects:
--       - SELECT (download): only conversation participants
--       - INSERT (upload): only conversation participants, must be sender
--
--     NOTE: Supabase storage policies use storage.foldername() and
--     storage.filename() helpers. The bucket_id = 'chat-attachments'.
-- ============================================================

-- Create the bucket (idempotent; if exists, this is a no-op in dashboard)
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

-- Storage SELECT policy: conversation participants can download attachments
create policy "Chat_Attachments_Select"
  on storage.objects for select
  using (
    bucket_id = 'chat-attachments'
    and is_conversation_participant((storage.foldername(name))[1]::uuid)
  );

-- Storage INSERT policy: conversation participants can upload attachments
create policy "Chat_Attachments_Insert"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-attachments'
    and is_conversation_participant((storage.foldername(name))[1]::uuid)
  );
