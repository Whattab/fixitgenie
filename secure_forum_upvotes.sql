-- Drop the old public upvote policies we created earlier
DROP POLICY IF EXISTS "Allow public upvotes on questions" ON forum_questions;
DROP POLICY IF EXISTS "Allow public upvotes on replies" ON forum_replies;

-- Allow ONLY authenticated (logged-in) users to update forum questions
CREATE POLICY "Users can upvote questions"
ON forum_questions
FOR UPDATE
TO authenticated
USING (true);

-- Allow ONLY authenticated (logged-in) users to update forum replies
CREATE POLICY "Users can upvote replies"
ON forum_replies
FOR UPDATE
TO authenticated
USING (true);
