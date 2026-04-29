-- Re-apply policies for Bids table to ensure they exist and are correct
-- We do NOT drop the table, only the policies.

alter table bids enable row level security;

-- Drop potentially conflicting or malformed policies
drop policy if exists "Pros can view own bids" on bids;
drop policy if exists "Homeowners can view bids on their requests" on bids;
drop policy if exists "Homeowners can update bid status" on bids;

-- Re-create Policy: Pros can view their own bids
create policy "Pros can view own bids"
on bids for select
using (auth.uid() = pro_id);

-- Re-create Policy: Pros can insert their own bids
-- (If this already exists it might error, but 'create policy if not exists' isn't standard in all PG versions, 
--  so we'll just ignore or drop it too to be safe)
drop policy if exists "Pros can insert bids" on bids;
create policy "Pros can insert bids"
on bids for insert
with check (auth.uid() = pro_id);

-- Re-create Policy: Homeowners can view bids on their requests
create policy "Homeowners can view bids on their requests"
on bids for select
using (
  exists (
    select 1 from service_requests
    where id = bids.request_id
    and user_id = auth.uid()
  )
);

-- Re-create Policy: Homeowners can update bid status
create policy "Homeowners can update bid status"
on bids for update
using (
  exists (
    select 1 from service_requests
    where id = bids.request_id
    and user_id = auth.uid()
  )
);
