-- Migration: Add feedback visibility, upvotes, and votes table
-- Created: 2026-04-13

-- Add visibility column to feedback_submissions
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "visibility" varchar(20) NOT NULL DEFAULT 'private';

-- Add upvotes column to feedback_submissions
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "upvotes" integer NOT NULL DEFAULT 0;

-- Create feedback_votes table
CREATE TABLE IF NOT EXISTS "feedback_votes" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
    "submission_id" text NOT NULL,
    "user_id" text NOT NULL,
    "user_email" text,
    "created_at" timestamp NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "feedback_votes_submission_id_idx" ON "feedback_votes" ("submission_id");
CREATE INDEX IF NOT EXISTS "feedback_votes_user_id_idx" ON "feedback_votes" ("user_id");
CREATE INDEX IF NOT EXISTS "feedback_votes_user_submission_idx" ON "feedback_votes" ("user_id", "submission_id");

-- Add index for visibility queries
CREATE INDEX IF NOT EXISTS "feedback_submissions_visibility_idx" ON "feedback_submissions" ("visibility");
CREATE INDEX IF NOT EXISTS "feedback_submissions_upvotes_idx" ON "feedback_submissions" ("upvotes" DESC);
