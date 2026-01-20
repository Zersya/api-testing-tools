import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { folders } from './folder';

/**
 * Supported HTTP methods for saved requests
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Type definitions for JSON fields
 */
export type RequestHeaders = Record<string, string>;
export type RequestBody = Record<string, unknown> | string | null;
export type RequestAuth = {
  type: 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2';
  credentials?: Record<string, string>;
} | null;

export const savedRequests = sqliteTable('saved_requests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  folderId: text('folder_id')
    .notNull()
    .references(() => folders.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  method: text('method').notNull().$type<HttpMethod>(),
  url: text('url').notNull(),
  headers: text('headers', { mode: 'json' }).$type<RequestHeaders>(),
  body: text('body', { mode: 'json' }).$type<RequestBody>(),
  auth: text('auth', { mode: 'json' }).$type<RequestAuth>(),
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

export type SavedRequest = typeof savedRequests.$inferSelect;
export type NewSavedRequest = typeof savedRequests.$inferInsert;
