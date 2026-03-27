import { boolean, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  baseUrl: varchar('base_url', { length: 255 }).notNull(),
  logoUrl: varchar('logo_url', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  crawlConfig: text('crawl_config'), // JSON string: selectors, pagination rules
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('stores_name_idx').on(t.name),
]);

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
