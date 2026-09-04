CREATE TABLE "collection_member_environments" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_member_id" text NOT NULL,
	"environment_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collection_members" ADD COLUMN "environment_access" text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "collection_member_environments" ADD CONSTRAINT "collection_member_environments_collection_member_id_collection_members_id_fk" FOREIGN KEY ("collection_member_id") REFERENCES "public"."collection_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_member_environments" ADD CONSTRAINT "collection_member_environments_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_collection_member_environments_member" ON "collection_member_environments" USING btree ("collection_member_id");--> statement-breakpoint
CREATE INDEX "idx_collection_member_environments_environment" ON "collection_member_environments" USING btree ("environment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_collection_member_environments_member_env" ON "collection_member_environments" USING btree ("collection_member_id","environment_id");