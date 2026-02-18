import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
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

/**
 * Mock configuration for per-request mock responses
 * Used when environment is set to CLOUD MOCK
 */
export type MockConfig = {
  isEnabled: boolean;
  statusCode: number;
  delay: number;
  responseBody: Record<string, unknown> | string | null;
  responseHeaders: Record<string, string>;
} | null;

export const savedRequests = pgTable('saved_requests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  folderId: text('folder_id')
    .notNull()
    .references(() => folders.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  method: text('method').notNull().$type<HttpMethod>(),
  url: text('url').notNull(),
  headers: text('headers').$type<RequestHeaders>(),
  body: text('body').$type<RequestBody>(),
  auth: text('auth').$type<RequestAuth>(),
  mockConfig: text('mock_config').$type<MockConfig>(),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at')
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
});

export type SavedRequest = typeof savedRequests.$inferSelect;
export type NewSavedRequest = typeof savedRequests.$inferInsert;
