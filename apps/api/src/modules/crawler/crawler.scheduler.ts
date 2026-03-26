import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrawlerService } from './crawler.service';

/**
 * Cron-based scheduler that enqueues crawl jobs on a per-category cadence.
 *
 * Schedule rationale:
 *   GPU/CPU — every 30 min (highest volatility, flash sales common)
 *   RAM/SSD — every 2 hours (moderate volatility)
 *   Full catalog sync — nightly at 2 AM (catches new listings, cleans stale ones)
 *
 * All crons use @nestjs/schedule which runs in the same process.
 * Each cron enqueues jobs into Bull rather than running the crawl inline,
 * so they are non-blocking and survive process restarts.
 */
@Injectable()
export class CrawlerScheduler {
  private readonly logger = new Logger(CrawlerScheduler.name);

  constructor(private readonly crawlerService: CrawlerService) {}

  /** GPU & CPU — every 30 minutes */
  @Cron('0 */30 * * * *')
  async scheduleHighVolatilityCrawl(): Promise<void> {
    this.logger.log('Cron: enqueuing GPU/CPU crawl');
    await this.crawlerService.enqueueAllStores({ triggeredBy: 'cron', note: 'high-volatility' });
  }

  /** RAM & SSD — every 2 hours */
  @Cron('0 0 */2 * * *')
  async scheduleMediumVolatilityCrawl(): Promise<void> {
    this.logger.log('Cron: enqueuing RAM/SSD crawl');
    await this.crawlerService.enqueueAllStores({ triggeredBy: 'cron', note: 'medium-volatility' });
  }

  /** Full catalog sync — nightly at 02:00 */
  @Cron('0 0 2 * * *')
  async scheduleNightlyCatalogSync(): Promise<void> {
    this.logger.log('Cron: enqueuing nightly full catalog sync');
    await this.crawlerService.enqueueAllStores({
      triggeredBy: 'cron',
      note: 'nightly-full-sync',
    });
  }
}
