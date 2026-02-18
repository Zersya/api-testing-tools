ALTER TABLE "saved_requests" ADD COLUMN "mock_config" text;--> statement-breakpoint
ALTER TABLE "environments" ADD COLUMN "is_mock_environment" boolean DEFAULT false NOT NULL;