-- Fix double-quoted header values in saved_requests table
-- This migration removes extra quotes from header values that were incorrectly stored

UPDATE saved_requests 
SET headers = REGEXP_REPLACE(
  headers,
  '"([a-zA-Z0-9_-]+)":\s*"\\"([^"]+)\\""',
  '"\1": "\2"',
  'g'
)
WHERE headers LIKE '%"\\"%';

-- Alternative approach: Fix specific Content-Type header pattern
UPDATE saved_requests 
SET headers = REPLACE(headers, '"Content-Type": "\\"application/json\\""', '"Content-Type": "application/json"')
WHERE headers LIKE '%"Content-Type": "\\"application/json\\""%';

-- Fix any other headers with the same pattern
UPDATE saved_requests 
SET headers = REPLACE(headers, '"\\"', '"')
WHERE headers LIKE '%"\\"%';
