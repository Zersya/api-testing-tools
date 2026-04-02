-- Add inherit_auth column to saved_requests table
ALTER TABLE saved_requests ADD COLUMN inherit_auth INTEGER DEFAULT 0;