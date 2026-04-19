import {
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { products } from './products';

export const benchmarkSourceEnum = pgEnum('benchmark_source', [
  'passmark',
  '3dmark',
  'cinebench',
  'geekbench',
  'userbenchmark',
  'manual',
]);

export const benchmarkScoreTypeEnum = pgEnum('benchmark_score_type', [
  'cpu_mark',
  'cpu_single_thread',
  'g3d_mark',
  'time_spy',
  'port_royal',
  'fire_strike',
  'multi_core',
  'single_core',
]);

export const benchmarkScores = pgTable(
  'benchmark_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    source: benchmarkSourceEnum('source').notNull(),
    scoreType: benchmarkScoreTypeEnum('score_type').notNull(),
    score: integer('score').notNull(),
    // 외부 소스의 원본 제품명 (매칭 확인용)
    sourceProductName: varchar('source_product_name', { length: 300 }),
    sourceUrl: varchar('source_url', { length: 500 }),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productIdx: index('benchmark_scores_product_idx').on(table.productId),
    sourceTypeIdx: index('benchmark_scores_source_type_idx').on(table.source, table.scoreType),
    uniqProductSourceType: uniqueIndex('benchmark_scores_uniq').on(
      table.productId,
      table.source,
      table.scoreType,
    ),
  }),
);

export type BenchmarkScore = typeof benchmarkScores.$inferSelect;
export type NewBenchmarkScore = typeof benchmarkScores.$inferInsert;
