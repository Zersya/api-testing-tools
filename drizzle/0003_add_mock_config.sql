-- Migration: Add mock_config to saved_requests and is_mock_environment to environments
-- Date: 2025-02-18

-- Add mock_config column to saved_requests table
ALTER TABLE "saved_requests" ADD COLUMN IF NOT EXISTS "mock_config" text;

-- Add is_mock_environment column to environments table
ALTER TABLE "environments" ADD COLUMN IF NOT EXISTS "is_mock_environment" boolean DEFAULT false NOT NULL;

-- Create partial index for mock environment lookups
CREATE INDEX IF NOT EXISTS "idx_environments_mock" ON "environments"("is_mock_environment") WHERE "is_mock_environment" = true;

-- Create index for mock_config lookups
CREATE INDEX IF NOT EXISTS "idx_saved_requests_method_url" ON "saved_requests"("method", "url");
