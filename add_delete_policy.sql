-- Allow Homeowners to DELETE their own requests
-- The 'cascade' delete on the foreign keys (bids, contact_info) in the schema 
-- ensures that deleting the request also cleans up the related data.

alter table service_requests enable row level security;

-- Drop existing delete policy if any (to avoid duplicates)
drop policy if exists "Users can delete own requests" on service_requests;

-- Create the Delete Policy
create policy "Users can delete own requests"
on service_requests for delete
using (auth.uid() = user_id);
