-- Migration to update settings table with new columns
-- Add workspace_id column
ALTER TABLE `settings` ADD COLUMN `workspace_id` text REFERENCES `workspaces`(`id`) ON DELETE cascade;

-- Add category column
ALTER TABLE `settings` ADD COLUMN `category` text DEFAULT 'general' NOT NULL;

-- Add version column
ALTER TABLE `settings` ADD COLUMN `version` integer DEFAULT 1 NOT NULL;

-- Add last_modified_at column
ALTER TABLE `settings` ADD COLUMN `last_modified_at` integer DEFAULT (unixepoch()) NOT NULL;

-- Add sync_id column
ALTER TABLE `settings` ADD COLUMN `sync_id` text;

-- Add is_deleted column
ALTER TABLE `settings` ADD COLUMN `is_deleted` integer DEFAULT false NOT NULL;
