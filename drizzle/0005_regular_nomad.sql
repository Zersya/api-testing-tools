CREATE TABLE "workspace_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"email" text NOT NULL,
	"user_id" text,
	"permission" text NOT NULL,
	"invited_by" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_workspace_members_workspace" ON "workspace_members" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_members_email" ON "workspace_members" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_workspace_members_user" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_members_status" ON "workspace_members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workspace_members_workspace_email" ON "workspace_members" USING btree ("workspace_id","email");