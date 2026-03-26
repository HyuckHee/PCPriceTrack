import {
  boolean,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { products } from './products';
import { stores } from './stores';

export const productListings = pgTable(
  'product_listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    // The store's own identifier (ASIN for Amazon, item number for Newegg, etc.)
    externalId: varchar('external_id', { length: 255 }).notNull(),
    url: varchar('url', { length: 1000 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    // Tracks when crawler last successfully found this listing
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    // Consecutive failures counter — used for circuit breaker logic
    failureCount: varchar('failure_count', { length: 10 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // One external product per store — prevents duplicate listings
    storeExternalUnique: unique('product_listings_store_external_unique').on(
      table.storeId,
      table.externalId,
    ),
    productIdx: index('product_listings_product_idx').on(table.productId),
    storeIdx: index('product_listings_store_idx').on(table.storeId),
    activeIdx: index('product_listings_active_idx').on(table.isActive),
  }),
);

export type ProductListing = typeof productListings.$inferSelect;
export type NewProductListing = typeof productListings.$inferInsert;
