import {
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * 동일한 물리적 제품을 여러 스토어/변형에 걸쳐 묶는 그룹 테이블.
 *
 * products.group_id → product_groups.id
 *   같은 group_id를 가진 products들은 하나의 상품 페이지로 표시됩니다.
 *
 * slug: 상품 상세 URL에 사용되는 대표 식별자.
 *       최초 등록된 product의 slug를 그대로 물려받습니다.
 */
export const productGroups = pgTable(
  'product_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 대표 상품명 — 그룹의 canonical 이름 */
    name: varchar('name', { length: 300 }).notNull(),
    /** 상세 페이지 URL slug (unique) */
    slug: varchar('slug', { length: 350 }).notNull().unique(),
    /** 대표 이미지 URL */
    imageUrl: varchar('image_url', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index('product_groups_slug_idx').on(table.slug),
  }),
);

export type ProductGroup    = typeof productGroups.$inferSelect;
export type NewProductGroup = typeof productGroups.$inferInsert;
