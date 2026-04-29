-- Run this in your Supabase SQL Editor to create the table for storing professional onboarding data

create table if not exists professional_details (
  pro_id uuid references auth.users not null primary key,
  onboarding_data jsonb not null,
  status text default 'pending_review',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table professional_details enable row level security;

-- Policies
-- Professional can insert their own row
create policy "Pros can insert own details" 
on professional_details for insert 
with check (auth.uid() = pro_id);

-- Professional can view and update their own row
create policy "Pros can view and update own details" 
on professional_details for all 
using (auth.uid() = pro_id);

-- Everyone can view approved profiles (for public profile pages later)
create policy "Public can view approved pro details" 
on professional_details for select 
using (status = 'approved');
