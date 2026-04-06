import { Inject, Injectable, Logger } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DATABASE_TOKEN, Database } from '../../database/database.provider';
import { crawlJobs, stores } from '../../database/schema';
import { AdapterFactory } from './adapters/adapter.factory';
import { CircuitBreakerService, CircuitState } from './services/circuit-breaker.service';
import { QUEUE_SERVICE, IQueueService } from './services/queue.interface';
import { CRAWL_JOB_OPTIONS, CRAWL_JOB_TYPES, DISCOVERY_CATEGORIES } from './constants';
import { CrawlJobPayload } from './dto/crawl-job.dto';

interface EnqueueOptions {
  triggeredBy: 'cron' | 'manual';
  note?: string;
}

export interface StoreStatus {
  storeId: string;
  storeName: string;
  isActive: boolean;
  circuitState: CircuitState;
  lastJobStatus: string | null;
  lastJobAt: Date | null;
  queuedJobs: number;
}

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    private readonly adapterFactory: AdapterFactory,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  /**
   * Enqueue crawl jobs for every active store that has a registered adapter.
   * Runs both discovery (new products) and full_store (price refresh) jobs.
   */
  async enqueueAllStores(options: EnqueueOptions): Promise<{ enqueued: number }> {
    const activeStores = await this.db
      .select()
      .from(stores)
      .where(eq(stores.isActive, true));

    let enqueued = 0;

    for (const store of activeStores) {
      try {
        this.adapterFactory.getAdapter(store.id); // validates adapter exists
      } catch {
        this.logger.debug(`No adapter for store "${store.name}" — skipping`);
        continue;
      }

      const allowed = await this.circuitBreaker.isAllowed(store.id);
      if (!allowed) {
        this.logger.warn(`Circuit OPEN for "${store.name}" — not enqueuing`);
        continue;
      }

      // Enqueue discovery for each category
      for (const categorySlug of DISCOVERY_CATEGORIES) {
        await this.enqueueDiscovery(store.id, categorySlug, options);
      }

      // Also enqueue price refresh for existing listings
      await this.enqueueStore(store.id, options);
      enqueued++;
    }

    return { enqueued };
  }

  /**
   * Enqueue a full crawl for a single store.
   */
  async enqueueStore(
    storeId: string,
    options: EnqueueOptions,
  ): Promise<{ crawlJobId: string; bullJobId: string | number }> {
    // Create DB record first so processor can update it
    const [dbJob] = await this.db
      .insert(crawlJobs)
      .values({
        storeId,
        status: 'pending',
        metadata: { triggeredBy: options.triggeredBy, note: options.note ?? '' },
      })
      .returning({ id: crawlJobs.id });

    const payload: CrawlJobPayload = {
      crawlJobId: dbJob.id,
      storeId,
      type: CRAWL_JOB_TYPES.FULL_STORE,
      triggeredBy: options.triggeredBy,
    };

    const queueJob = await this.queue.add(
      CRAWL_JOB_TYPES.FULL_STORE,
      payload,
      CRAWL_JOB_OPTIONS[CRAWL_JOB_TYPES.FULL_STORE],
    );

    this.logger.log(
      `Enqueued full crawl for store ${storeId} | crawlJobId=${dbJob.id} | jobId=${queueJob.id}`,
    );

    return { crawlJobId: dbJob.id, bullJobId: queueJob.id };
  }

  /**
   * Enqueue a discovery job for a store + category.
   */
  async enqueueDiscovery(
    storeId: string,
    categorySlug: string,
    options: EnqueueOptions,
  ): Promise<{ crawlJobId: string; bullJobId: string | number }> {
    const [dbJob] = await this.db
      .insert(crawlJobs)
      .values({
        storeId,
        status: 'pending',
        metadata: { triggeredBy: options.triggeredBy, categorySlug, note: options.note ?? 'discovery' },
      })
      .returning({ id: crawlJobs.id });

    const payload: CrawlJobPayload = {
      crawlJobId: dbJob.id,
      storeId,
      type: CRAWL_JOB_TYPES.DISCOVERY,
      categorySlug,
      triggeredBy: options.triggeredBy,
    };

    const queueJob = await this.queue.add(
      CRAWL_JOB_TYPES.DISCOVERY,
      payload,
      CRAWL_JOB_OPTIONS[CRAWL_JOB_TYPES.DISCOVERY],
    );

    this.logger.log(
      `Enqueued discovery for store ${storeId} | category=${categorySlug} | crawlJobId=${dbJob.id}`,
    );

    return { crawlJobId: dbJob.id, bullJobId: queueJob.id };
  }

  /**
   * Enqueue a targeted crawl for specific listing IDs (e.g. after alert creation).
   */
  async enqueueTargeted(
    storeId: string,
    listingIds: string[],
    options: EnqueueOptions,
  ): Promise<{ crawlJobId: string; bullJobId: string | number }> {
    const [dbJob] = await this.db
      .insert(crawlJobs)
      .values({
        storeId,
        status: 'pending',
        metadata: {
          triggeredBy: options.triggeredBy,
          listingIds,
          note: options.note ?? 'targeted',
        },
      })
      .returning({ id: crawlJobs.id });

    const payload: CrawlJobPayload = {
      crawlJobId: dbJob.id,
      storeId,
      type: CRAWL_JOB_TYPES.TARGETED,
      listingIds,
      triggeredBy: options.triggeredBy,
    };

    const queueJob = await this.queue.add(
      CRAWL_JOB_TYPES.TARGETED,
      payload,
      CRAWL_JOB_OPTIONS[CRAWL_JOB_TYPES.TARGETED],
    );

    return { crawlJobId: dbJob.id, bullJobId: queueJob.id };
  }

  /**
   * Dashboard-ready status for all stores.
   */
  async getStoreStatuses(): Promise<StoreStatus[]> {
    const allStores = await this.db.select().from(stores);
    const statuses: StoreStatus[] = [];

    for (const store of allStores) {
      const [lastJob] = await this.db
        .select({ status: crawlJobs.status, createdAt: crawlJobs.createdAt })
        .from(crawlJobs)
        .where(eq(crawlJobs.storeId, store.id))
        .orderBy(desc(crawlJobs.createdAt))
        .limit(1);

      const circuitData = await this.circuitBreaker.getState(store.id);
      const queuedCount = await this.queue.getWaitingCount();

      statuses.push({
        storeId: store.id,
        storeName: store.name,
        isActive: store.isActive,
        circuitState: circuitData.state,
        lastJobStatus: lastJob?.status ?? null,
        lastJobAt: lastJob?.createdAt ?? null,
        queuedJobs: queuedCount,
      });
    }

    return statuses;
  }

  /**
   * Toggle a store's isActive flag.
   */
  async toggleStore(storeId: string, isActive: boolean): Promise<{ storeId: string; isActive: boolean }> {
    await this.db
      .update(stores)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(stores.id, storeId));

    this.logger.log(`Store ${storeId} isActive → ${isActive}`);
    return { storeId, isActive };
  }

  /**
   * Manually reset a store's circuit breaker (admin action).
   */
  async resetCircuit(storeId: string): Promise<void> {
    await this.circuitBreaker.reset(storeId);
  }

  /**
   * Get recent crawl jobs (for admin job log).
   */
  async getRecentJobs(limit = 50) {
    return this.db
      .select()
      .from(crawlJobs)
      .orderBy(desc(crawlJobs.createdAt))
      .limit(limit);
  }
}
