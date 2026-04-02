--> statement-breakpoint
-- Add status column to feedback submissions
ALTER TABLE "feedback_submissions" 
ADD COLUMN "status" varchar(20) NOT NULL DEFAULT 'open';

--> statement-breakpoint
-- Create index for status filtering
CREATE INDEX "feedback_submissions_status_idx" ON "feedback_submissions"("status");

--> statement-breakpoint
-- Create status history table for audit trail
CREATE TABLE "feedback_status_history" (
  "id" text PRIMARY KEY,
  "submission_id" text NOT NULL,
  "from_status" varchar(20) NOT NULL,
  "to_status" varchar(20) NOT NULL,
  "changed_by" text NOT NULL,
  "changed_at" timestamp NOT NULL DEFAULT NOW()
);

--> statement-breakpoint
-- Add index on submission_id for performance
CREATE INDEX "feedback_status_history_submission_id_idx" ON "feedback_status_history"("submission_id");

--> statement-breakpoint
-- Add index on changed_at for sorting
CREATE INDEX "feedback_status_history_changed_at_idx" ON "feedback_status_history"("changed_at" DESC);

--> statement-breakpoint
-- Add foreign key constraint
ALTER TABLE "feedback_status_history" 
ADD CONSTRAINT "feedback_status_history_submission_id_fkey" 
FOREIGN KEY ("submission_id") REFERENCES "feedback_submissions"("id") ON DELETE CASCADE;
