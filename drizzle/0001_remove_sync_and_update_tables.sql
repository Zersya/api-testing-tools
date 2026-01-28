-- Drop sync-related tables
DROP TABLE IF EXISTS sync_changes;
DROP TABLE IF EXISTS sync_conflicts;
DROP TABLE IF EXISTS sync_sessions;

-- Note: We don't drop the mocks table here because it would delete all data
-- The mocks table schema was already updated manually
-- If you need to recreate it, do it manually with backup

-- Create settings table if not exists (safe to run multiple times)
CREATE TABLE IF NOT EXISTS `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- Create unique index on settings key
CREATE UNIQUE INDEX IF NOT EXISTS `settings_key_unique` ON `settings` (`key`);
