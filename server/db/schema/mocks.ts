import { pgTable, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { collections } from './collection';

export const mocks = pgTable('mocks', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id')
    .references(() => collections.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  method: text('method').notNull(),
  status: integer('status').notNull().default(200),
  response: text('response').$type<Record<string, unknown>>(),
  delay: integer('delay').notNull().default(0),
  secure: boolean('secure').notNull().default(false),
  createdAt: timestamp('created_at')
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
});

export type Mock = typeof mocks.$inferSelect;
export type NewMock = typeof mocks.$inferInsert;
