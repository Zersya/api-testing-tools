import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './project';

export const collections = pgTable('collections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  authConfig: text('auth_config').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at')
    .notNull()
    .defaultNow()
}, (table) => ({
  projectIdx: index('idx_collections_project').on(table.projectId)
}));

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
