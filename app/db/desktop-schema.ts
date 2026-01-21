import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  isDirty: integer('is_dirty', { mode: 'boolean' }).default(false),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' })
})

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  isDirty: integer('is_dirty', { mode: 'boolean' }).default(false),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' })
})

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  isDirty: integer('is_dirty', { mode: 'boolean' }).default(false),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' })
})

export const savedRequests = sqliteTable('saved_requests', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id').references(() => collections.id),
  name: text('name').notNull(),
  method: text('method').notNull(),
  url: text('url').notNull(),
  headers: text('headers'),
  body: text('body'),
  response: text('response'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  isDirty: integer('is_dirty', { mode: 'boolean' }).default(false),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' })
})

export const environments = sqliteTable('environments', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  name: text('name').notNull(),
  variables: text('variables'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  isDirty: integer('is_dirty', { mode: 'boolean' }).default(false),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' })
})

export const syncLog = sqliteTable('sync_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  status: text('status').default('pending'),
  payload: text('payload'),
  error: text('error')
})

export const folders = sqliteTable('folders', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id').references(() => collections.id),
  parentFolderId: text('parent_folder_id'),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  isDirty: integer('is_dirty', { mode: 'boolean' }).default(false),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' })
})

export const requestHistory = sqliteTable('request_history', {
  id: text('id').primaryKey(),
  requestId: text('request_id'),
  method: text('method').notNull(),
  url: text('url').notNull(),
  headers: text('headers'),
  body: text('body'),
  statusCode: integer('status_code'),
  response: text('response'),
  duration: integer('duration'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  isDirty: integer('is_dirty', { mode: 'boolean' }).default(false),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' })
})

export const apiDefinitions = sqliteTable('api_definitions', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id),
  name: text('name').notNull(),
  type: text('type').notNull(),
  content: text('content').notNull(),
  format: text('format').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql('CURRENT_TIMESTAMP')),
  isDirty: integer('is_dirty', { mode: 'boolean' }).default(false),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' })
})

export type Workspace = typeof workspaces.$inferSelect
export type Project = typeof projects.$inferSelect
export type Collection = typeof collections.$inferSelect
export type SavedRequest = typeof savedRequests.$inferSelect
export type Environment = typeof environments.$inferSelect
export type Folder = typeof folders.$inferSelect
export type RequestHistory = typeof requestHistory.$inferSelect
export type ApiDefinition = typeof apiDefinitions.$inferSelect
