-- UPGRADE STATUS TO 'ASSIGNED'
-- Run this in Supabase SQL Editor

-- 1. Rename existing "in_progress" requests to "assigned"
update service_requests 
set status = 'assigned' 
where status = 'in_progress';

-- 2. Update the "Assigned" Policy (from restrict_visibility.sql)
drop policy if exists "Assigned Pros view their jobs" on service_requests;

create policy "Assigned Pros view their jobs"
on service_requests for select
using (
  status = 'assigned'         -- <--- Changed from 'in_progress'
  and is_assigned_pro(id)
);
