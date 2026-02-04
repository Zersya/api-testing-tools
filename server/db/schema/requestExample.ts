import { pgTable, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { savedRequests } from './savedRequest';

/**
 * Type definitions for JSON fields
 */
export type ExampleHeaders = Record<string, string>;
export type ExampleBody = Record<string, unknown> | string | null;

/**
 * Request examples for storing multiple response examples per request
 * Supports multiple examples per status code (e.g., "Success - Valid User", "Success - Admin User")
 */
export const requestExamples = pgTable('request_examples', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  requestId: text('request_id')
    .notNull()
    .references(() => savedRequests.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., "Success - Valid User", "Error - Not Found"
  statusCode: integer('status_code').notNull(),
  headers: text('headers').$type<ExampleHeaders>(),
  body: text('body').$type<ExampleBody>(),
  isDefault: boolean('is_default').notNull().default(false), // Which example to use as primary
  createdAt: timestamp('created_at')
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
});

export type RequestExample = typeof requestExamples.$inferSelect;
export type NewRequestExample = typeof requestExamples.$inferInsert;
