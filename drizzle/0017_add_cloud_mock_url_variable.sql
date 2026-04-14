-- Migration: Add URL variable to existing CLOUD MOCK environments
-- Date: 2025-04-14

-- Enable uuid-ossp extension for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert URL variable into all CLOUD MOCK environments that don't already have it
-- Note: Update the URL value to match your deployment URL (e.g., https://your-domain.com)
INSERT INTO "environment_variables" ("id", "environment_id", "key", "value", "is_secret")
SELECT 
  uuid_generate_v4(),
  e.id,
  'URL',
  'http://localhost:3000',
  false
FROM "environments" e
WHERE e."is_mock_environment" = true
  AND e."name" = 'CLOUD MOCK'
  AND NOT EXISTS (
    SELECT 1 FROM "environment_variables" ev 
    WHERE ev."environment_id" = e.id 
    AND ev."key" = 'URL'
  );

-- Log how many variables were added
-- SELECT COUNT(*) as url_variables_added FROM "environment_variables" 
-- WHERE "key" = 'URL' AND "value" = '{{$appUrl}}';