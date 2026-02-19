ALTER TABLE "saved_requests" ALTER COLUMN "folder_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "saved_requests" ADD COLUMN "collection_id" text;--> statement-breakpoint
ALTER TABLE "saved_requests" ADD CONSTRAINT "saved_requests_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_requests" ADD CONSTRAINT "folder_or_collection_check" CHECK ("saved_requests"."folder_id" IS NOT NULL OR "saved_requests"."collection_id" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "saved_requests" ADD CONSTRAINT "not_both_check" CHECK (NOT ("saved_requests"."folder_id" IS NOT NULL AND "saved_requests"."collection_id" IS NOT NULL));