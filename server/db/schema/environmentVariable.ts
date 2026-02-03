import { pgTable, text, integer, boolean } from 'drizzle-orm/pg-core';
import { environments } from './environment';

export const environmentVariables = pgTable('environment_variables', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  environmentId: text('environment_id')
    .notNull()
    .references(() => environments.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value').notNull(),
  isSecret: boolean('is_secret').notNull().default(false)
});

export type EnvironmentVariable = typeof environmentVariables.$inferSelect;
export type NewEnvironmentVariable = typeof environmentVariables.$inferInsert;
