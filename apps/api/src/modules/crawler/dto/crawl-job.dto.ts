import { CrawlJobType } from '../constants';

export interface CrawlJobPayload {
  /** ID in crawl_jobs table — created before the job is enqueued */
  crawlJobId: string;
  storeId: string;
  type: CrawlJobType;
  /** Populated for targeted jobs only */
  listingIds?: string[];
  /** Populated for discovery jobs only */
  categorySlug?: string;
  triggeredBy: 'cron' | 'manual';
}

export interface CrawlJobResult {
  crawlJobId: string;
  urlsAttempted: number;
  urlsSucceeded: number;
  urlsFailed: number;
}
