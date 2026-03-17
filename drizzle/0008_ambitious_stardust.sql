CREATE TABLE "feedback_config" (
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"shown_from" timestamp,
	"shown_until" timestamp,
	"title" text DEFAULT 'We value your feedback' NOT NULL,
	"description" text DEFAULT 'Help us improve by sharing your thoughts',
	"questions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "feedback_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"user_email" text,
	"workspace_id" text,
	"responses" jsonb NOT NULL,
	"rating" integer,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip_address" text
);
