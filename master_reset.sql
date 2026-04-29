-- MASTER RESET: FIX ALL PERMISSIONS
-- This script wipes the slate clean. It drops ALL existing rules and re-applies the correct ones.
-- Run this to fix "My Requests" hidden, "My Bids" hidden, and "Infinite Recursion".

-- A. HELPER FUNCTION (Crucial for recursion fix)
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

-- 1. Reset Policies
drop policy if exists "Homeowners view own requests" on service_requests;
drop policy if exists "Users can create requests" on service_requests;
drop policy if exists "Users can update own requests" on service_requests;
drop policy if exists "Users can delete own requests" on service_requests;
drop policy if exists "Pros view open requests" on service_requests;
drop policy if exists "Pros view requests they bid on" on service_requests;
drop policy if exists "Assigned Pros view their jobs" on service_requests;
drop policy if exists "Everyone can view requests (for now)." on service_requests;

-- 2. Apply Correct Policies
create policy "Homeowners_Select" on service_requests for select 
using (auth.uid() = user_id);

create policy "Homeowners_Insert" on service_requests for insert 
with check (auth.uid() = user_id);

create policy "Homeowners_Update" on service_requests for update 
using (auth.uid() = user_id);

create policy "Homeowners_Delete" on service_requests for delete 
using (auth.uid() = user_id);

create policy "Pros_Select_Marketplace" on service_requests for select 
using (
  status = 'open'            -- Option 1: It's an open job
  OR
  has_bid_on_request(id)     -- Option 2: I have already bid on it (uses Safe Function)
);


-- C. BIDS TABLE
alter table bids enable row level security;

-- 1. Reset Policies
drop policy if exists "Pros_View_Own" on bids;
drop policy if exists "Pros_Insert_Own" on bids;
drop policy if exists "Pros delete own bids" on bids;
drop policy if exists "Homeowners_View_Request_Bids" on bids;
drop policy if exists "Homeowners_Update_Bids" on bids;

-- 2. Apply Correct Policies
create policy "Pro_Select_Own" on bids for select 
using (auth.uid() = pro_id);

create policy "Pro_Insert_Own" on bids for insert 
with check (auth.uid() = pro_id);

create policy "Pro_Delete_Own" on bids for delete 
using (auth.uid() = pro_id);

create policy "Homeowner_Select_Bids" on bids for select 
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
drop policy if exists "Pros_View_Accepted_Info" on request_contact_info;

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
