CREATE TABLE "error_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"datadog_error_id" text,
	"datadog_session_id" text,
	"datadog_trace_id" text,
	"datadog_span_id" text,
	"error_type" text NOT NULL,
	"error_message" text NOT NULL,
	"error_stack" text,
	"error_severity" text DEFAULT 'error' NOT NULL,
	"user_id" text,
	"user_email" text,
	"workspace_id" text,
	"route" text,
	"component_name" text,
	"file_name" text,
	"line_number" integer,
	"column_number" integer,
	"user_agent" text,
	"browser_info" jsonb,
	"context" jsonb,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" text,
	"resolution_notes" text,
	"feedback_submission_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "datadog_error_id" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "datadog_session_id" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "error_context" jsonb;--> statement-breakpoint
CREATE INDEX "idx_error_reports_datadog_error" ON "error_reports" USING btree ("datadog_error_id");--> statement-breakpoint
CREATE INDEX "idx_error_reports_datadog_session" ON "error_reports" USING btree ("datadog_session_id");--> statement-breakpoint
CREATE INDEX "idx_error_reports_user" ON "error_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_error_reports_workspace" ON "error_reports" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_error_reports_type" ON "error_reports" USING btree ("error_type");--> statement-breakpoint
CREATE INDEX "idx_error_reports_severity" ON "error_reports" USING btree ("error_severity");--> statement-breakpoint
CREATE INDEX "idx_error_reports_status" ON "error_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_error_reports_created_at" ON "error_reports" USING btree ("created_at");