-- Admin policies for professional_details table

-- Allow admins to update any row in professional_details
create policy "Admins can update professional_details." on professional_details
for update using (
    exists (
        select 1 from profiles
        where profiles.id = auth.uid() and profiles.role = 'admin'
    )
);

-- Allow admins to select any row in professional_details
create policy "Admins can view all professional_details." on professional_details
for select using (
    exists (
        select 1 from profiles
        where profiles.id = auth.uid() and profiles.role = 'admin'
    )
);

-- Sync any existing approved pros
update professional_details
set status = 'approved'
where pro_id in (
    select id from profiles where vetting_status = 'approved'
);
