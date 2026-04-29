-- 1. DROP EVERYTHING FIRST (Reset)
drop policy if exists "Homeowners view own requests" on service_requests;
drop policy if exists "Homeowners_Select" on service_requests;
drop policy if exists "Users can create requests" on service_requests;
drop policy if exists "Users can update own requests" on service_requests;
drop policy if exists "Users can delete own requests" on service_requests;
drop policy if exists "Pros view open requests" on service_requests;
drop policy if exists "Pros view requests they bid on" on service_requests;
drop policy if exists "Pros_Select_Marketplace" on service_requests;
drop policy if exists "Assigned Pros view their jobs" on service_requests;
drop policy if exists "Homeowners_ALL_Access" on service_requests;
drop policy if exists "Pros_View_Marketplace" on service_requests;
drop policy if exists "Everyone can view requests (for now)." on service_requests;

drop policy if exists "Pros_View_Own" on bids;
drop policy if exists "Pro_Select_Own" on bids;
drop policy if exists "Pro_Insert_Own" on bids;
drop policy if exists "Pro_Update_Own" on bids;
drop policy if exists "Pro_Delete_Own" on bids;
drop policy if exists "Pros delete own bids" on bids;
drop policy if exists "Homeowner_Select_Bids" on bids;
drop policy if exists "Pro_Manage_Own_Bids" on bids;
drop policy if exists "Homeowner_View_Bids" on bids;
drop policy if exists "Homeowner_Update_Bids" on bids;

drop function if exists has_bid_on_request(bigint);

-- 2. CREATE HELPER FUNCTION
create or replace function has_bid_on_request(target_request_id bigint)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from bids 
    where bids.request_id = target_request_id 
    and bids.pro_id = auth.uid()
  );
end;
$$;

-- 3. APPLY RULES: SERVICE REQUESTS
alter table service_requests enable row level security;

create policy "Homeowners_ALL_Access" on service_requests
using (auth.uid() = user_id);

create policy "Pros_View_Marketplace" on service_requests for select 
using (
  status = 'open'            
  OR
  has_bid_on_request(id)     
);

-- 4. APPLY RULES: BIDS
alter table bids enable row level security;

create policy "Pro_Manage_Own_Bids" on bids
using (auth.uid() = pro_id);

create policy "Homeowner_View_Bids" on bids for select 
using (
  exists (select 1 from service_requests where id = bids.request_id and user_id = auth.uid())
);

create policy "Homeowner_Update_Bids" on bids for update 
using (
  exists (select 1 from service_requests where id = bids.request_id and user_id = auth.uid())
);
