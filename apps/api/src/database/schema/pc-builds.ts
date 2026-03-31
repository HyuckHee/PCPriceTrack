import { char, jsonb, numeric, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export interface BuildComponent {
  category: string;       // 'gpu' | 'cpu' | 'ram' | 'ssd'
  categoryName: string;   // '그래픽카드' | 'CPU' | '메모리' | 'SSD'
  productId: string;
  productName: string;
  slug: string;
  brand: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  storeUrl: string | null;
  storeName: string | null;
  inStock: boolean;
}

export const pcBuilds = pgTable('pc_builds', {
  id: uuid('id').primaryKey().defaultRandom(),
  // nullable — guests can save builds without an account
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 200 }).notNull().default('나의 조립 PC'),
  budget: numeric('budget', { precision: 10, scale: 2 }).notNull(),
  currency: char('currency', { length: 3 }).notNull().default('USD'),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }),
  components: jsonb('components').notNull().$type<BuildComponent[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PcBuild = typeof pcBuilds.$inferSelect;
export type NewPcBuild = typeof pcBuilds.$inferInsert;
