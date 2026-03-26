import {
  boolean,
  char,
  index,
  numeric,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { productListings } from './product-listings';

// Append-only table — records are never updated, only inserted.
// This preserves full price history for trend analysis.
export const priceRecords = pgTable(
  'price_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => productListings.id, { onDelete: 'cascade' }),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    // Store's advertised list/MSRP price (the strikethrough "was" price shown on product page)
    originalPrice: numeric('original_price', { precision: 10, scale: 2 }),
    currency: char('currency', { length: 3 }).notNull().default('USD'),
    inStock: boolean('in_stock').notNull().default(true),
    // When the crawler actually recorded this price (not "now" to allow backfilling)
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Primary query pattern: "give me price history for this listing, newest first"
    listingRecordedIdx: index('price_records_listing_recorded_idx').on(
      table.listingId,
      table.recordedAt,
    ),
    recordedAtIdx: index('price_records_recorded_at_idx').on(table.recordedAt),
  }),
);

export type PriceRecord = typeof priceRecords.$inferSelect;
export type NewPriceRecord = typeof priceRecords.$inferInsert;
