-- Drop old permissive upvote policies if they exist so we can recreate them clearly
DROP POLICY IF EXISTS "Users can upvote replies" ON forum_replies;
DROP POLICY IF EXISTS "Allow public upvotes on questions" ON forum_questions;
DROP POLICY IF EXISTS "Allow public upvotes on replies" ON forum_replies;

-- Allow ANY user (even those not logged in) to update forum questions
CREATE POLICY "Allow public upvotes on questions"
ON forum_questions
FOR UPDATE
USING (true);

-- Allow ANY user (even those not logged in) to update forum replies
CREATE POLICY "Allow public upvotes on replies"
ON forum_replies
FOR UPDATE
USING (true);
