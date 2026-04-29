-- STRICT VISIBILITY CONTROLS
-- Run this in Supabase SQL Editor

-- 1. Drop the old "View Everyone" policy
drop policy if exists "Everyone can view requests (for now)." on service_requests;
drop policy if exists "Public requests are viewable by everyone" on service_requests;

-- 2. Define New Policies

-- Policy A: Homeowners see their own requests (Always)
create policy "Homeowners view own requests"
on service_requests for select
using (auth.uid() = user_id);

-- Policy B: Professionals see OPEN requests (Marketplace)
create policy "Pros view open requests"
on service_requests for select
using (status = 'open');

-- Policy C: Assigned Professionals see their IN_PROGRESS requests
create policy "Assigned Pros view their jobs"
on service_requests for select
using (
  status = 'in_progress' 
  and exists (
    select 1 from bids 
    where bids.request_id = service_requests.id 
    and bids.pro_id = auth.uid() 
    and bids.status = 'accepted'
  )
);

-- 3. Ensure Homeowners can still UPDATE status (needed for acceptance flow)
-- (We might already have "Users can update own requests.", but let's be safe)
drop policy if exists "Users can update own requests." on service_requests;
create policy "Users can update own requests."
on service_requests for update
using (auth.uid() = user_id);
