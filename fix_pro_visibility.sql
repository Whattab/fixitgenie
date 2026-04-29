-- FIX PRO VISIBILITY & PERMISSIONS
-- Run this in Supabase SQL Editor

-- 1. Fix "Unknown Request" Issue
-- Problem: Pros couldn't see the request details after it was assigned to someone else.
-- Fix: Allow Pros to see ANY request they have bid on, regardless of status.

drop policy if exists "Assigned Pros view their jobs" on service_requests;

create policy "Pros view requests they bid on"
on service_requests for select
using (
  status = 'open' -- Still see all open jobs
  OR
  exists (        -- OR see jobs I have bid on (even if assigned/closed)
    select 1 from bids 
    where bids.request_id = service_requests.id 
    and bids.pro_id = auth.uid()
  )
);

-- 2. Allow Pros to DELETE their own bids
create policy "Pros delete own bids"
on bids for delete
using (auth.uid() = pro_id);
