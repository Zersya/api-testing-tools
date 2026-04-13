CREATE TABLE "feedback_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "visibility" varchar(20) DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "upvotes" integer DEFAULT 0 NOT NULL;