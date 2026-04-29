-- FIX INFINITE RECURSION ERROR
-- Run this in Supabase SQL Editor

-- The issue is a cycle:
-- service_requests policy -> checks bids -> checks service_requests -> LOOP.

-- Solution: Use a SECURITY DEFINER function to check the 'bids' table.
-- This creates a "privileged" lookup that bypasses the RLS recursion loop.

-- 1. Create the cleaner function
create or replace function is_assigned_pro(req_id bigint)
returns boolean
language plpgsql
security definer -- <--- This is the magic key (runs as admin, bypasses RLS)
as $$
begin
  return exists (
    select 1 from bids 
    where bids.request_id = req_id 
    and bids.pro_id = auth.uid() 
    and bids.status = 'accepted'
  );
end;
$$;

-- 2. Drop the problematic policy on service_requests
drop policy if exists "Assigned Pros view their jobs" on service_requests;

-- 3. Re-create using the function
create policy "Assigned Pros view their jobs"
on service_requests for select
using (
  status = 'in_progress' 
  and is_assigned_pro(id) -- Uses the function instead of direct subquery
);
