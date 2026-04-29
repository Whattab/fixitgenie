-- COMPLETE REPAIR KIT: FIX ALL PERMISSIONS
-- This script wipes the slate clean and re-applies ALL rules.
-- Run this ONCE to fix:
-- 1. "My Requests" hidden for Homeowners
-- 2. "My Bids" hidden for Pros
-- 3. "Infinite Recursion" errors
-- 4. Enable Bid Editing for Pros

-- A. HELPER FUNCTION (Safe Mode to prevent Recursion)
create or replace function has_bid_on_request(target_request_id bigint)
returns boolean
language plpgsql
security definer -- Bypass RLS to avoid loops
as $$
begin
  return exists (
    select 1 from bids 
    where bids.request_id = target_request_id 
    and bids.pro_id = auth.uid()
  );
end;
$$;

-- B. SERVICE REQUESTS TABLE
alter table service_requests enable row level security;

-- 1. Reset Policies (Delete old ones)
drop policy if exists "Homeowners view own requests" on service_requests;
drop policy if exists "Homeowners_Select" on service_requests;
drop policy if exists "Users can create requests" on service_requests;
drop policy if exists "Users can update own requests" on service_requests;
drop policy if exists "Users can delete own requests" on service_requests;
drop policy if exists "Pros view open requests" on service_requests;
drop policy if exists "Pros view requests they bid on" on service_requests;
drop policy if exists "Pros_Select_Marketplace" on service_requests;
drop policy if exists "Assigned Pros view their jobs" on service_requests;

-- 2. Apply FINAL Correct Policies
-- Homeowners can ALWAYS see/edit/delete their own requests
create policy "Homeowners_ALL_Access" on service_requests
using (auth.uid() = user_id);

-- Pros can see OPEN jobs OR jobs they BID on (even if assigned)
create policy "Pros_View_Marketplace" on service_requests for select 
using (
  status = 'open'            
  OR
  has_bid_on_request(id)     
);


-- C. BIDS TABLE
alter table bids enable row level security;

-- 1. Reset Policies
drop policy if exists "Pros_View_Own" on bids;
drop policy if exists "Pro_Select_Own" on bids;
drop policy if exists "Pro_Insert_Own" on bids;
drop policy if exists "Pro_Update_Own" on bids;
drop policy if exists "Pro_Delete_Own" on bids;
drop policy if exists "Pros delete own bids" on bids;
drop policy if exists "Homeowner_Select_Bids" on bids;

-- 2. Apply FINAL Correct Policies
-- Pros can Full Control their own bids
create policy "Pro_Manage_Own_Bids" on bids
using (auth.uid() = pro_id);

-- Homeowners set Bids on their requests
create policy "Homeowner_View_Bids" on bids for select 
using (
  exists (select 1 from service_requests where id = bids.request_id and user_id = auth.uid())
);

create policy "Homeowner_Update_Bids" on bids for update 
using (
  exists (select 1 from service_requests where id = bids.request_id and user_id = auth.uid())
);


-- D. CONTACT INFO TABLE
alter table request_contact_info enable row level security;

-- 1. Reset Policies
drop policy if exists "Homeowners_Manage_Info" on request_contact_info;
drop policy if exists "Homeowner_Manage_Info" on request_contact_info;
drop policy if exists "Pro_View_Accepted" on request_contact_info;

-- 2. Apply Correct Policies
create policy "Homeowner_Manage_Info" on request_contact_info 
using (
  exists (select 1 from service_requests where id = request_contact_info.request_id and user_id = auth.uid())
);

create policy "Pro_View_Accepted" on request_contact_info for select 
using (
  exists (
    select 1 from bids 
    where bids.request_id = request_contact_info.request_id 
    and bids.pro_id = auth.uid() 
    and bids.status = 'accepted'
  )
);
