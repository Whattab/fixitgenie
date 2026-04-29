-- FIX INFINITE RECURSION (FINAL)
-- The error returned because the new "Pro Visibility" rule created a loop.
-- We must use a "Security Definer" function to break this loop.

-- 1. Create a Helper Function (Safe Lookup)
create or replace function has_bid_on_request(request_id bigint)
returns boolean
language plpgsql
security definer -- <--- This allows checking Bids without triggering the infinite loop
as $$
begin
  return exists (
    select 1 from bids 
    where bids.request_id = request_id 
    and bids.pro_id = auth.uid()
  );
end;
$$;

-- 2. Drop the buggy policy
drop policy if exists "Pros view requests they bid on" on service_requests;

-- 3. Re-create the Policy using the Safe Function
create policy "Pros view requests they bid on"
on service_requests for select
using (
  status = 'open'         -- Can see all open jobs
  OR
  has_bid_on_request(id)  -- OR jobs I have bid on (using the safe function)
);
