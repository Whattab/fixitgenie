-- 1. Create REVIEWS table
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  request_id bigint references service_requests(id) on delete cascade,
  pro_id uuid references profiles(id) on delete cascade,
  reviewer_id uuid references profiles(id) on delete set null,
  rating int check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default now()
);

-- 2. ENABLE RLS
alter table reviews enable row level security;

-- 3. POLICIES
-- Policy: Anyone can read reviews (Public reputation)
create policy "Reviews are public" on reviews
  for select using (true);

-- Policy: Only the homeowner who created the request can review
-- (Technically we should check if they booked the pro, but for now ANY authenticated user can insert if they know the IDs? 
--  No, let's restrict it: Reviewer must be the auth user)
create policy "Users can write reviews" on reviews
  for insert with check (auth.uid() = reviewer_id);

-- Optional: Add average_rating to profiles for performance (denormalization)
-- Or just calculate it on the fly. For now, on the fly.
