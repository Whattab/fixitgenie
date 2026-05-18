-- add_homeowner_profile_columns.sql
-- Homeowner Profile V1 (Tier 1) — new columns on the profiles table.
-- Run this in the Supabase SQL Editor.  Safe to re-run (all use IF NOT EXISTS).
--
-- Columns city / state / zipcode were already added by add_location_to_profiles.sql.
-- notify_email_on_message was already added by messaging_notifications_schema.sql.
-- This migration adds only the two columns that are genuinely new.

-- Phone number (private — never exposed to pros via RLS policies).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

-- Short bio for homeowner (max 200 chars enforced in the UI).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
