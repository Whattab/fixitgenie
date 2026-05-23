-- reviews_v2_constraints.sql
-- Prevent duplicate reviews + allow homeowners to edit their existing review.
-- Run this in the Supabase SQL Editor. Safe to re-run.

-- =============================================================================
-- 1. Deduplicate any existing reviews (keep most recent per request+reviewer).
--    This must run BEFORE the unique constraint is added.
-- =============================================================================
delete from reviews r
where exists (
  select 1
  from reviews newer
  where newer.request_id  = r.request_id
    and newer.reviewer_id = r.reviewer_id
    and newer.created_at  > r.created_at
);

-- =============================================================================
-- 2. Add a unique constraint: one review per (request, reviewer).
--    From now on the DB itself rejects duplicates.
-- =============================================================================
alter table reviews
  drop constraint if exists reviews_unique_per_reviewer_per_request;

alter table reviews
  add constraint reviews_unique_per_reviewer_per_request
  unique (request_id, reviewer_id);

-- =============================================================================
-- 3. Allow the original reviewer to UPDATE their own review.
--    Without this, "edit your review" silently fails.
-- =============================================================================
drop policy if exists "Reviewers can update own reviews" on reviews;

create policy "Reviewers can update own reviews"
  on reviews for update
  using (auth.uid() = reviewer_id)
  with check (auth.uid() = reviewer_id);

-- =============================================================================
-- 4. Quick sanity queries you can run after applying:
-- =============================================================================

-- Check the constraint exists:
--   select conname from pg_constraint
--    where conrelid = 'reviews'::regclass
--      and conname  = 'reviews_unique_per_reviewer_per_request';

-- Check the policy exists:
--   select policyname from pg_policies
--    where tablename  = 'reviews'
--      and policyname = 'Reviewers can update own reviews';
