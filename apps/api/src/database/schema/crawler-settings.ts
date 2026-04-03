import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

/**
 * 크롤러 설정 키-값 저장소.
 * 스케줄(cron expression), 기타 런타임 설정 영구 보관.
 */
export const crawlerSettings = pgTable('crawler_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CrawlerSetting = typeof crawlerSettings.$inferSelect;
