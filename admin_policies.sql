-- Admin Policies for Profiles Table

-- Drop policies if they already exist to prevent errors on re-run
drop policy if exists "Admins can update all profiles." on profiles;
drop policy if exists "Admins can delete proflies." on profiles;

-- 1. Allow Admins to update any profile (e.g., Promote User)
create policy "Admins can update all profiles." on profiles 
  for update using (
    exists (
      select 1 from profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- 2. Allow Admins to delete any profile
create policy "Admins can delete proflies." on profiles 
  for delete using (
    exists (
      select 1 from profiles 
      where id = auth.uid() and role = 'admin'
    )
  );
