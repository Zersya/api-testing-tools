import { pgTable, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { collections } from './collection';
import { environments } from './environment';

/**
 * Member permission levels for collection sharing
 */
export type CollectionMemberPermission = 'view' | 'edit';

/**
 * Invitation status for collection members
 */
export type CollectionMemberStatus = 'pending' | 'accepted' | 'revoked';

/**
 * Environment grant on a collection member invitation.
 * all = every environment in the collection's project(s)
 * allowlist = only rows in collection_member_environments
 */
export type CollectionMemberEnvironmentAccess = 'all' | 'allowlist';

/**
 * Collection members table - stores explicit email invitations for collections
 */
export const collectionMembers = pgTable('collection_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  collectionId: text('collection_id')
    .notNull()
    .references(() => collections.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  userId: text('user_id'),
  permission: text('permission').notNull().$type<CollectionMemberPermission>(),
  invitedBy: text('invited_by').notNull(),
  status: text('status').notNull().default('pending').$type<CollectionMemberStatus>(),
  environmentAccess: text('environment_access')
    .notNull()
    .default('all')
    .$type<CollectionMemberEnvironmentAccess>(),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  revokedAt: timestamp('revoked_at')
}, (table) => ({
  collectionIdx: index('idx_collection_members_collection').on(table.collectionId),
  emailIdx: index('idx_collection_members_email').on(table.email),
  userIdx: index('idx_collection_members_user').on(table.userId),
  statusIdx: index('idx_collection_members_status').on(table.status),
  collectionEmailIdx: index('idx_collection_members_collection_email').on(table.collectionId, table.email)
}));

/**
 * Collection member environments - stores allowed environment IDs for
 * collection members with environmentAccess = 'allowlist'
 */
export const collectionMemberEnvironments = pgTable('collection_member_environments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  collectionMemberId: text('collection_member_id')
    .notNull()
    .references(() => collectionMembers.id, { onDelete: 'cascade' }),
  environmentId: text('environment_id')
    .notNull()
    .references(() => environments.id, { onDelete: 'cascade' })
}, (table) => ({
  memberIdx: index('idx_collection_member_environments_member').on(table.collectionMemberId),
  envIdx: index('idx_collection_member_environments_environment').on(table.environmentId),
  memberEnvUnique: uniqueIndex('idx_collection_member_environments_member_env').on(table.collectionMemberId, table.environmentId)
}));

export type CollectionMember = typeof collectionMembers.$inferSelect;
export type NewCollectionMember = typeof collectionMembers.$inferInsert;
export type CollectionMemberEnvironment = typeof collectionMemberEnvironments.$inferSelect;
export type NewCollectionMemberEnvironment = typeof collectionMemberEnvironments.$inferInsert;
