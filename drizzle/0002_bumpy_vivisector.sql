CREATE TABLE "workspace_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"share_token" text NOT NULL,
	"permission" text NOT NULL,
	"created_by" text NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_shares_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "workspace_access" (
	"id" text PRIMARY KEY NOT NULL,
	"share_id" text NOT NULL,
	"user_id" text NOT NULL,
	"permission" text NOT NULL,
	"accessed_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "visibility" text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_shares" ADD CONSTRAINT "workspace_shares_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_access" ADD CONSTRAINT "workspace_access_share_id_workspace_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."workspace_shares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_workspace_shares_token" ON "workspace_shares" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "idx_workspace_shares_workspace" ON "workspace_shares" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_shares_created_by" ON "workspace_shares" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_workspace_access_share" ON "workspace_access" USING btree ("share_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_access_user" ON "workspace_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_access_share_user" ON "workspace_access" USING btree ("share_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_workspaces_owner" ON "workspaces" USING btree ("owner_id");