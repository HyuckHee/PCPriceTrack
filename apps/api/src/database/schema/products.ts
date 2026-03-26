import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { categories } from './categories';

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 300 }).notNull(),
    brand: varchar('brand', { length: 100 }).notNull(),
    model: varchar('model', { length: 200 }).notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    slug: varchar('slug', { length: 350 }).notNull().unique(),
    imageUrl: varchar('image_url', { length: 500 }),
    description: text('description'),
    // Flexible specs: { cores: 8, tdp: 125, socket: 'AM5' } for CPU
    //                 { vram: 16, bus: '256-bit' } for GPU, etc.
    specs: jsonb('specs').notNull().default({}),
    // Normalized search field: "amd ryzen 9 7950x cpu"
    searchVector: text('search_vector'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    categoryIdx: index('products_category_idx').on(table.categoryId),
    brandIdx: index('products_brand_idx').on(table.brand),
    slugIdx: index('products_slug_idx').on(table.slug),
  }),
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
