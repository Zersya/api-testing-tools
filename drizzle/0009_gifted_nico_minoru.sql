CREATE TABLE "daily_usage_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text NOT NULL,
	"workspace_id" text NOT NULL,
	"request_executions" integer DEFAULT 0,
	"request_creates" integer DEFAULT 0,
	"request_updates" integer DEFAULT 0,
	"request_deletes" integer DEFAULT 0,
	"collection_creates" integer DEFAULT 0,
	"collection_updates" integer DEFAULT 0,
	"collection_deletes" integer DEFAULT 0,
	"folder_creates" integer DEFAULT 0,
	"folder_updates" integer DEFAULT 0,
	"folder_deletes" integer DEFAULT 0,
	"mock_creates" integer DEFAULT 0,
	"mock_updates" integer DEFAULT 0,
	"mock_deletes" integer DEFAULT 0,
	"environment_creates" integer DEFAULT 0,
	"environment_updates" integer DEFAULT 0,
	"environment_deletes" integer DEFAULT 0,
	"project_creates" integer DEFAULT 0,
	"project_updates" integer DEFAULT 0,
	"project_deletes" integer DEFAULT 0,
	"workspace_creates" integer DEFAULT 0,
	"workspace_updates" integer DEFAULT 0,
	"workspace_deletes" integer DEFAULT 0,
	"avg_response_time_ms" integer,
	"success_rate" integer,
	"total_success_count" integer DEFAULT 0,
	"total_failure_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text NOT NULL,
	"workspace_id" text NOT NULL,
	"event_type" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"resource_name" text,
	"method" text,
	"url" text,
	"status_code" integer,
	"response_time_ms" integer,
	"success" boolean,
	"metadata" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_daily_stats_date" ON "daily_usage_stats" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_daily_stats_user" ON "daily_usage_stats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_daily_stats_workspace" ON "daily_usage_stats" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_daily_stats_date_user" ON "daily_usage_stats" USING btree ("date","user_id");--> statement-breakpoint
CREATE INDEX "idx_daily_stats_date_workspace" ON "daily_usage_stats" USING btree ("date","workspace_id");--> statement-breakpoint
CREATE INDEX "idx_usage_events_user" ON "usage_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_usage_events_workspace" ON "usage_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_usage_events_type" ON "usage_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_usage_events_timestamp" ON "usage_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_usage_events_user_timestamp" ON "usage_events" USING btree ("user_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_usage_events_workspace_timestamp" ON "usage_events" USING btree ("workspace_id","timestamp");