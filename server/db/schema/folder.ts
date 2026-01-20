import { sqliteTable, text, integer, AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { collections } from './collection';

export const folders = sqliteTable('folders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  collectionId: text('collection_id')
    .notNull()
    .references(() => collections.id, { onDelete: 'cascade' }),
  parentFolderId: text('parent_folder_id')
    .references((): AnySQLiteColumn => folders.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  order: integer('order').notNull().default(0)
});

export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
