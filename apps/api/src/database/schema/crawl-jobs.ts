import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { stores } from './stores';

export const crawlJobStatusEnum = pgEnum('crawl_job_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'dead', // moved to dead-letter queue after max retries
]);

export const crawlJobs = pgTable(
  'crawl_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    status: crawlJobStatusEnum('status').notNull().default('pending'),
    // Number of URLs attempted in this job
    urlsAttempted: integer('urls_attempted').notNull().default(0),
    urlsSucceeded: integer('urls_succeeded').notNull().default(0),
    urlsFailed: integer('urls_failed').notNull().default(0),
    // Stores error details for failed/dead jobs
    errorLog: text('error_log'),
    // Metadata: trigger type (cron|manual), schedule key
    metadata: jsonb('metadata').notNull().default({}),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    storeIdx: index('crawl_jobs_store_idx').on(table.storeId),
    statusIdx: index('crawl_jobs_status_idx').on(table.status),
    createdAtIdx: index('crawl_jobs_created_at_idx').on(table.createdAt),
  }),
);

export type CrawlJob = typeof crawlJobs.$inferSelect;
export type NewCrawlJob = typeof crawlJobs.$inferInsert;
