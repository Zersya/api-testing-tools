import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { workspaceShares, type SharePermission } from './workspaceShare';

/**
 * Workspace access table - tracks users who have accessed a workspace via share link
 * Records when a user first accessed and last accessed the shared workspace
 */
export const workspaceAccess = pgTable('workspace_access', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  shareId: text('share_id')
    .notNull()
    .references(() => workspaceShares.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(), // User ID who accessed via share
  permission: text('permission').notNull().$type<SharePermission>(),
  accessedAt: timestamp('accessed_at').notNull().defaultNow(),
  lastAccessedAt: timestamp('last_accessed_at').notNull().defaultNow()
}, (table) => ({
  shareIdx: index('idx_workspace_access_share').on(table.shareId),
  userIdx: index('idx_workspace_access_user').on(table.userId),
  shareUserIdx: index('idx_workspace_access_share_user').on(table.shareId, table.userId)
}));

export type WorkspaceAccess = typeof workspaceAccess.$inferSelect;
export type NewWorkspaceAccess = typeof workspaceAccess.$inferInsert;
