-- Allow admins to delete service requests
drop policy if exists "Admins can delete any request" on service_requests;
create policy "Admins can delete any request" on service_requests
for delete using (
  exists (
    select 1 from profiles 
    where id = auth.uid() and role = 'admin'
  )
);

-- Allow admins to delete bids (needed for cascading deletes)
drop policy if exists "Admins can delete bids" on bids;
create policy "Admins can delete bids" on bids
for delete using (
  exists (
    select 1 from profiles 
    where id = auth.uid() and role = 'admin'
  )
);

-- Allow admins to delete request_contact_info (needed for cascading deletes)
drop policy if exists "Admins can delete request contact info" on request_contact_info;
create policy "Admins can delete request contact info" on request_contact_info
for delete using (
  exists (
    select 1 from profiles 
    where id = auth.uid() and role = 'admin'
  )
);

-- Allow admins to delete forum questions
drop policy if exists "Admins can delete any forum question" on forum_questions;
create policy "Admins can delete any forum question" on forum_questions
for delete using (
  exists (
    select 1 from profiles 
    where id = auth.uid() and role = 'admin'
  )
);

-- Allow admins to delete forum replies (needed for cascading deletes)
drop policy if exists "Admins can delete any forum reply" on forum_replies;
create policy "Admins can delete any forum reply" on forum_replies
for delete using (
  exists (
    select 1 from profiles 
    where id = auth.uid() and role = 'admin'
  )
);
