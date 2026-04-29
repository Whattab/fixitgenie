-- Add service_categories to the profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS service_categories TEXT;
