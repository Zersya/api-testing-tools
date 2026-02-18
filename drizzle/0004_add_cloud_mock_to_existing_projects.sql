-- Migration: Add CLOUD MOCK environment to existing projects
-- Date: 2025-02-18

-- Insert CLOUD MOCK environment for all projects that don't already have it
INSERT INTO "environments" ("id", "project_id", "name", "is_active", "is_mock_environment", "created_at")
SELECT 
  gen_random_uuid(),
  p.id,
  'CLOUD MOCK',
  false,
  true,
  NOW()
FROM "projects" p
WHERE NOT EXISTS (
  SELECT 1 FROM "environments" e 
  WHERE e.project_id = p.id 
  AND e.name = 'CLOUD MOCK'
);
