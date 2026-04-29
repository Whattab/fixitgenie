-- Add upvotes column to forum_replies
ALTER TABLE forum_replies ADD COLUMN upvotes INT DEFAULT 0;

-- Optional: ensure appropriate RLS is set for updating replies if needed, 
-- or users might already have update access due to existing policies.
-- If anyone can upvote, we need a policy allowing update of forum_replies
-- for authenticated users.

CREATE POLICY "Users can upvote replies" 
ON forum_replies 
FOR UPDATE 
TO authenticated 
USING (true);
