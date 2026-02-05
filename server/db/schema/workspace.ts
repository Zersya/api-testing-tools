import { pgTable, text, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Workspace visibility types
 * - private: Only owner can access
 * - shared: Owner and users with share links can access
 */
export type WorkspaceVisibility = 'private' | 'shared';

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  ownerId: text('owner_id'), // User ID who created/owns the workspace
  visibility: text('visibility').notNull().default('private').$type<WorkspaceVisibility>(),
  createdAt: timestamp('created_at')
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
}, (table) => ({
  ownerIdx: index('idx_workspaces_owner').on(table.ownerId)
}));

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
