-- NUCLEAR OPTION DEBUGGING
-- This will open up the 'bids' table to EVERYONE.
-- Use this ONLY to verify if RLS is the problem.

alter table bids enable row level security;

-- 1. Drop ALL existing policies on bids to be sure
drop policy if exists "Pros can view own bids" on bids;
drop policy if exists "Pros can insert bids" on bids;
drop policy if exists "Homeowners can view bids on their requests" on bids;
drop policy if exists "Homeowners can update bid status" on bids;
drop policy if exists "Debug View All" on bids;

-- 2. Create a "View All" policy
create policy "Debug View All"
on bids for select
using (true);

-- 3. Create a "Insert All" policy
create policy "Debug Insert All"
on bids for insert
with check (true);
