-- Run this snippet in your Supabase SQL Editor
-- This adds the 'is_premium' column to all existing profiles, and sets it to FALSE by default

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- If you want to manually make someone premium right now for testing, you can run:
-- UPDATE public.profiles SET is_premium = TRUE WHERE email = 'YOUR_EMAIL_HERE';
