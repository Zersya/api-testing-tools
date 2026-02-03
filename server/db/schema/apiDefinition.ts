import { pgTable, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './project';

export const apiDefinitions = pgTable('api_definitions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  specFormat: text('spec_format').notNull(),
  specContent: text('spec_content').notNull(),
  sourceUrl: text('source_url'),
  isPublic: boolean('is_public').notNull().default(false),
  publicSlug: text('public_slug'),
  createdAt: timestamp('created_at')
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
});

export type ApiDefinition = typeof apiDefinitions.$inferSelect;
export type NewApiDefinition = typeof apiDefinitions.$inferInsert;
