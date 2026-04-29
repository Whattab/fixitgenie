-- ENABLE BID EDITING
-- Run this in Supabase SQL Editor

-- Allow Pros to UPDATE their own bids
create policy "Pro_Update_Own"
on bids for update
using (auth.uid() = pro_id);
