-- FIX BID ACCEPTANCE FLOW
-- Run this in Supabase SQL Editor

-- 1. Allow Homeowners to UPDATE bids (to change status to 'accepted')
drop policy if exists "Homeowners can update bids" on bids;
create policy "Homeowners can update bids"
on bids for update
using (
  auth.uid() in (
    select user_id from service_requests where id = bids.request_id
  )
);

-- 2. Allow Pros to SEE contact info (only if they have an accepted bid)
alter table request_contact_info enable row level security;

drop policy if exists "Pros view contact info for accepted bids" on request_contact_info;
create policy "Pros view contact info for accepted bids"
on request_contact_info for select
using (
  exists (
    select 1 from bids 
    where bids.request_id = request_contact_info.request_id 
    and bids.pro_id = auth.uid() 
    and bids.status = 'accepted'
  )
);

-- 3. Ensure Homeowners can view their own contact info (so they can verify it was saved)
drop policy if exists "Homeowners view own contact info" on request_contact_info;
create policy "Homeowners view own contact info"
on request_contact_info for select
using (
  exists (
    select 1 from service_requests
    where service_requests.id = request_contact_info.request_id
    and service_requests.user_id = auth.uid()
  )
);

-- 4. Allow Homeowners to INSERT contact info (needed for request creation!)
drop policy if exists "Homeowners insert contact info" on request_contact_info;
create policy "Homeowners insert contact info"
on request_contact_info for insert
with check (
   exists (
    select 1 from service_requests
    where service_requests.id = request_contact_info.request_id
    and service_requests.user_id = auth.uid()
  )
);
