-- FORCE FIX PERMISSIONS (Run this in Supabase SQL Editor)
-- This blocks resets ALL security rules for Bids to ensure nothing is blocking the update.

-- 1. Reset BIDS Table Policies
alter table bids enable row level security;

-- Drop ALL existing potential policies to avoid conflicts
drop policy if exists "Pros can view own bids" on bids;
drop policy if exists "Pros can insert bids" on bids;
drop policy if exists "Homeowners can view bids on their requests" on bids;
drop policy if exists "Homeowners can update bids" on bids;
drop policy if exists "Homeowners can update bid status" on bids;
drop policy if exists "Debug View All" on bids;

-- Re-create Clean Policies

-- A. Pros: View and Insert their own bids
create policy "Pros_View_Own" on bids for select 
using (auth.uid() = pro_id);

create policy "Pros_Insert_Own" on bids for insert 
with check (auth.uid() = pro_id);

-- B. Homeowners: View bids for their requests
create policy "Homeowners_View_Request_Bids" on bids for select 
using (
  auth.uid() in (
    select user_id from service_requests where id = bids.request_id
  )
);

-- C. Homeowners: ACCEPT Bids (Update Permission) - CRITICAL FIX
create policy "Homeowners_Update_Bids" on bids for update 
using (
  auth.uid() in (
    select user_id from service_requests where id = bids.request_id
  )
);


-- 2. Reset CONTACT INFO Policies
alter table request_contact_info enable row level security;

drop policy if exists "Homeowners view own contact info" on request_contact_info;
drop policy if exists "Homeowners insert contact info" on request_contact_info;
drop policy if exists "Pros view contact info for accepted bids" on request_contact_info;

-- A. Homeowners: Full control over their own contact info
create policy "Homeowners_Manage_Info" on request_contact_info 
using (
  auth.uid() in (
    select user_id from service_requests where id = request_contact_info.request_id
  )
);

-- B. Pros: View info ONLY if bid is ACCEPTED
create policy "Pros_View_Accepted_Info" on request_contact_info for select 
using (
  exists (
    select 1 from bids 
    where bids.request_id = request_contact_info.request_id 
    and bids.pro_id = auth.uid() 
    and bids.status = 'accepted'
  )
);
