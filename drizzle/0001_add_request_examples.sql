CREATE TABLE "request_examples" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"name" text NOT NULL,
	"status_code" integer NOT NULL,
	"headers" text,
	"body" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "request_examples" ADD CONSTRAINT "request_examples_request_id_saved_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."saved_requests"("id") ON DELETE cascade ON UPDATE no action;