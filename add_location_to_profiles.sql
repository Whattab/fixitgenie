-- Add location columns to the profiles table
ALTER TABLE profiles ADD COLUMN zipcode VARCHAR(20) DEFAULT '';
ALTER TABLE profiles ADD COLUMN city VARCHAR(100) DEFAULT '';
ALTER TABLE profiles ADD COLUMN state VARCHAR(50) DEFAULT '';
