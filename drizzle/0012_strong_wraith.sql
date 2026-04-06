CREATE TABLE "feedback_status_history" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"from_status" varchar(20) NOT NULL,
	"to_status" varchar(20) NOT NULL,
	"changed_by" text NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_requests" ADD COLUMN "inherit_auth" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "status" varchar(20) DEFAULT 'open' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_projects_workspace" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_collections_project" ON "collections" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_folders_collection" ON "folders" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "idx_folders_parent" ON "folders" USING btree ("parent_folder_id");--> statement-breakpoint
CREATE INDEX "idx_folders_order" ON "folders" USING btree ("order");--> statement-breakpoint
CREATE INDEX "idx_requests_folder" ON "saved_requests" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "idx_requests_collection" ON "saved_requests" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "idx_requests_order" ON "saved_requests" USING btree ("order");--> statement-breakpoint
CREATE INDEX "idx_examples_request" ON "request_examples" USING btree ("request_id");