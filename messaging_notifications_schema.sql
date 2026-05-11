-- messaging_notifications_schema.sql
-- Phase 6: Email notification support columns on profiles.
-- Run this in Supabase SQL Editor BEFORE deploying notify-message Edge Function.
-- DO NOT apply automatically — deploy manually per README.

-- last_seen_at: updated by the client heartbeat every 60 s while the tab is
-- visible. The Edge Function uses this to decide whether the recipient is
-- "active in the app" and can skip the email.
alter table profiles
  add column if not exists last_seen_at timestamptz default now();

-- notify_email_on_message: user preference flag. When false the Edge Function
-- exits without sending regardless of last_seen_at. Defaults to true so that
-- all existing users receive notifications until they opt out.
alter table profiles
  add column if not exists notify_email_on_message boolean default true;

-- Index so the Edge Function can look up last_seen_at efficiently.
create index if not exists idx_profiles_last_seen
  on profiles(last_seen_at);
