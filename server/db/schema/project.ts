import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';

export const projects = pgTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  baseUrl: text('base_url'),
  createdAt: timestamp('created_at')
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
}, (table) => ({
  workspaceIdx: index('idx_projects_workspace').on(table.workspaceId)
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
