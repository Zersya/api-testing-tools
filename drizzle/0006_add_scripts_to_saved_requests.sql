-- Add pre_script and post_script columns to saved_requests table
ALTER TABLE saved_requests
ADD COLUMN IF NOT EXISTS pre_script TEXT,
ADD COLUMN IF NOT EXISTS post_script TEXT;