import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DATABASE_TOKEN, Database } from '../../database/database.provider';
import { categories, crawlJobs, productListings, products } from '../../database/schema';
import { AdapterFactory } from './adapters/adapter.factory';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { PriceIngestionService } from './services/price-ingestion.service';
import { Job } from './services/in-memory-queue.service';
import { QUEUE_SERVICE, IQueueService } from './services/queue.interface';
import { CRAWL_JOB_TYPES } from './constants';
import { CrawlJobPayload, CrawlJobResult } from './dto/crawl-job.dto';
import { ListingTarget } from './interfaces/adapter.interface';

@Injectable()
export class CrawlerProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CrawlerProcessor.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly adapterFactory: AdapterFactory,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly priceIngestion: PriceIngestionService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  onModuleInit(): void {
    this.queue.registerHandler<CrawlJobPayload>(CRAWL_JOB_TYPES.FULL_STORE, (job) =>
      this.processCrawlJob(job),
    );
    this.queue.registerHandler<CrawlJobPayload>(CRAWL_JOB_TYPES.TARGETED, (job) =>
      this.processCrawlJob(job),
    );
    this.queue.registerHandler<CrawlJobPayload>(CRAWL_JOB_TYPES.DISCOVERY, (job) =>
      this.handleDiscovery(job),
    );

    this.queue.onFailed<CrawlJobPayload>(async (job, err) => {
      const { crawlJobId, storeId } = job.data;
      this.logger.error(
        `Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${err.message}`,
      );

      const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
      const status = isFinalAttempt ? 'dead' : 'failed';

      await this.updateCrawlJob(crawlJobId, status, {
        errorLog: `[attempt ${job.attemptsMade}] ${err.message}\n${err.stack ?? ''}`.slice(0, 5000),
        completedAt: isFinalAttempt ? new Date() : undefined,
      });

      if (isFinalAttempt) {
        await this.circuitBreaker.recordFailure(storeId);
        this.logger.error(
          `Job ${job.id} moved to dead-letter after ${job.attemptsMade} attempts`,
        );
      }
    });

    this.queue.onCompleted<CrawlJobPayload>((job, result) => {
      this.logger.debug(
        `Queue event: job ${job.id} completed — ${JSON.stringify(result)}`,
      );
    });
  }

  async handleDiscovery(job: Job<CrawlJobPayload>): Promise<CrawlJobResult> {
    const { crawlJobId, storeId, categorySlug, triggeredBy } = job.data;

    this.logger.log(
      `Discovery job ${job.id} | storeId=${storeId} | category=${categorySlug} | trigger=${triggeredBy}`,
    );

    const isAllowed = await this.circuitBreaker.isAllowed(storeId);
    if (!isAllowed) {
      await this.updateCrawlJob(crawlJobId, 'failed', {
        errorLog: 'Circuit breaker OPEN',
      });
      throw new Error(`Circuit breaker OPEN for store ${storeId}`);
    }

    await this.updateCrawlJob(crawlJobId, 'running', { startedAt: new Date() });

    const adapter = this.adapterFactory.getAdapter(storeId);
    if (!adapter.discoverProductUrls) {
      this.logger.warn(`Store ${storeId} adapter does not support discovery`);
      await this.updateCrawlJob(crawlJobId, 'completed', {
        urlsAttempted: 0, urlsSucceeded: 0, urlsFailed: 0, completedAt: new Date(),
      });
      return { crawlJobId, urlsAttempted: 0, urlsSucceeded: 0, urlsFailed: 0 };
    }

    // 1. Discover product URLs from category page
    const urls = await adapter.discoverProductUrls(categorySlug!);
    if (urls.length === 0) {
      this.logger.warn(`No URLs discovered for category ${categorySlug} on store ${storeId}`);
      await this.updateCrawlJob(crawlJobId, 'completed', {
        urlsAttempted: 0, urlsSucceeded: 0, urlsFailed: 0, completedAt: new Date(),
      });
      return { crawlJobId, urlsAttempted: 0, urlsSucceeded: 0, urlsFailed: 0 };
    }

    // 2. Filter out URLs already in DB
    const existing = await this.db
      .select({ url: productListings.url })
      .from(productListings)
      .where(eq(productListings.storeId, storeId));
    const knownUrls = new Set(existing.map((l) => l.url));
    const newUrls = urls.filter((u) => !knownUrls.has(u));

    this.logger.log(
      `[Discovery] ${urls.length} discovered, ${newUrls.length} new for category=${categorySlug}`,
    );

    if (newUrls.length === 0) {
      await this.updateCrawlJob(crawlJobId, 'completed', {
        urlsAttempted: 0, urlsSucceeded: 0, urlsFailed: 0, completedAt: new Date(),
      });
      return { crawlJobId, urlsAttempted: 0, urlsSucceeded: 0, urlsFailed: 0 };
    }

    // 3. Look up category
    const [category] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.slug, categorySlug!));

    if (!category) {
      const err = `Category not found: ${categorySlug}`;
      await this.updateCrawlJob(crawlJobId, 'failed', { errorLog: err });
      throw new Error(err);
    }

    // 4. Scrape new URLs for product details + prices
    const scrapeResults = await adapter.scrapeUrls(newUrls);
    const failedCount = newUrls.length - scrapeResults.length;

    // 5. Upsert products + listings + ingest prices
    let succeeded = 0;
    for (const result of scrapeResults) {
      if (!result.externalId) continue;
      try {
        // Check if listing exists by externalId
        const [existingListing] = await this.db
          .select({ id: productListings.id })
          .from(productListings)
          .where(
            and(
              eq(productListings.storeId, storeId),
              eq(productListings.externalId, result.externalId),
            ),
          );

        let listingId: string;

        if (existingListing) {
          listingId = existingListing.id;
        } else {
          const name = result.productName ?? result.externalId;
          const brand = result.brand ?? 'Unknown';
          const slug = this.toSlug(`${name}-${result.externalId}`);

          // Insert product (ignore conflict on slug)
          let productId: string;
          const inserted = await this.db
            .insert(products)
            .values({ name, brand, model: result.externalId, categoryId: category.id, slug, imageUrl: result.imageUrl })
            .onConflictDoNothing()
            .returning({ id: products.id });

          if (inserted.length > 0) {
            productId = inserted[0].id;
          } else {
            const [existing] = await this.db
              .select({ id: products.id })
              .from(products)
              .where(eq(products.slug, slug));
            if (!existing) continue;
            productId = existing.id;
          }

          // Insert listing (ignore conflict on store_id + external_id)
          const insertedListing = await this.db
            .insert(productListings)
            .values({ productId, storeId, externalId: result.externalId, url: result.url })
            .onConflictDoNothing()
            .returning({ id: productListings.id });

          if (insertedListing.length > 0) {
            listingId = insertedListing[0].id;
          } else {
            const [existing] = await this.db
              .select({ id: productListings.id })
              .from(productListings)
              .where(
                and(
                  eq(productListings.storeId, storeId),
                  eq(productListings.externalId, result.externalId),
                ),
              );
            if (!existing) continue;
            listingId = existing.id;
          }
        }

        await this.priceIngestion.ingest(listingId, result);

        // Update imageUrl on the product if we got one and it's not yet set
        if (result.imageUrl) {
          const [listing] = await this.db
            .select({ productId: productListings.productId })
            .from(productListings)
            .where(eq(productListings.id, listingId));
          if (listing) {
            await this.db
              .update(products)
              .set({ imageUrl: result.imageUrl })
              .where(and(eq(products.id, listing.productId), eq(products.imageUrl, null as unknown as string)));
          }
        }

        await this.circuitBreaker.recordSuccess(storeId);
        succeeded++;
      } catch (err) {
        this.logger.error(`Failed to persist discovery result ${result.externalId}: ${(err as Error).message}`);
        await this.circuitBreaker.recordFailure(storeId);
      }
    }

    await this.updateCrawlJob(crawlJobId, 'completed', {
      urlsAttempted: newUrls.length,
      urlsSucceeded: succeeded,
      urlsFailed: failedCount + (scrapeResults.length - succeeded),
      completedAt: new Date(),
    });

    this.logger.log(
      `Discovery job ${job.id} done | created/updated=${succeeded} | failed=${failedCount}`,
    );

    return {
      crawlJobId,
      urlsAttempted: newUrls.length,
      urlsSucceeded: succeeded,
      urlsFailed: failedCount,
    };
  }

  private toSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 300);
  }

  private async processCrawlJob(job: Job<CrawlJobPayload>): Promise<CrawlJobResult> {
    const { crawlJobId, storeId, listingIds, triggeredBy } = job.data;

    this.logger.log(
      `Processing job ${job.id} | storeId=${storeId} | trigger=${triggeredBy} | attempt=${job.attemptsMade + 1}`,
    );

    // ── Circuit breaker check ──────────────────────────────────────────────
    const isAllowed = await this.circuitBreaker.isAllowed(storeId);
    if (!isAllowed) {
      this.logger.warn(`Circuit OPEN for store ${storeId} — skipping job ${job.id}`);
      await this.updateCrawlJob(crawlJobId, 'failed', {
        errorLog: 'Circuit breaker OPEN — store temporarily blocked',
      });
      throw new Error(`Circuit breaker OPEN for store ${storeId}`);
    }

    // ── Mark job as running ────────────────────────────────────────────────
    await this.updateCrawlJob(crawlJobId, 'running', { startedAt: new Date() });

    // ── Fetch listing targets ──────────────────────────────────────────────
    const targets = await this.fetchTargets(storeId, listingIds);
    if (targets.length === 0) {
      this.logger.warn(`No active listings found for store ${storeId}`);
      await this.updateCrawlJob(crawlJobId, 'completed', {
        urlsAttempted: 0,
        urlsSucceeded: 0,
        urlsFailed: 0,
        completedAt: new Date(),
      });
      return { crawlJobId, urlsAttempted: 0, urlsSucceeded: 0, urlsFailed: 0 };
    }

    // ── Run adapter ────────────────────────────────────────────────────────
    const adapter = this.adapterFactory.getAdapter(storeId);
    const { succeeded, failed } = await adapter.scrapeListings(targets);

    // ── Ingest results ─────────────────────────────────────────────────────
    let alertsTriggered = 0;
    for (const result of succeeded) {
      const target = targets.find(
        (t) => t.externalId === result.externalId || t.url === result.url,
      );
      if (!target) continue;

      try {
        const summary = await this.priceIngestion.ingest(target.listingId, result);
        alertsTriggered += summary.alertsTriggered;
        await this.circuitBreaker.recordSuccess(storeId);
      } catch (err) {
        this.logger.error(
          `Ingestion failed for listing ${target.listingId}: ${(err as Error).message}`,
        );
      }
    }

    // ── Handle failures ────────────────────────────────────────────────────
    for (const failure of failed) {
      if (failure.listingId) {
        await this.priceIngestion.recordFailure(failure.listingId, failure.reason);
      }
      if (!failure.retryable) {
        await this.circuitBreaker.recordFailure(storeId);
      }
    }

    const result: CrawlJobResult = {
      crawlJobId,
      urlsAttempted: targets.length,
      urlsSucceeded: succeeded.length,
      urlsFailed: failed.length,
    };

    await this.updateCrawlJob(crawlJobId, 'completed', {
      urlsAttempted: result.urlsAttempted,
      urlsSucceeded: result.urlsSucceeded,
      urlsFailed: result.urlsFailed,
      completedAt: new Date(),
    });

    this.logger.log(
      `Job ${job.id} done | ✓ ${succeeded.length} | ✗ ${failed.length} | alerts=${alertsTriggered}`,
    );

    return result;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async fetchTargets(
    storeId: string,
    listingIds?: string[],
  ): Promise<ListingTarget[]> {
    const rows = await this.db
      .select({
        listingId: productListings.id,
        url: productListings.url,
        externalId: productListings.externalId,
      })
      .from(productListings)
      .where(
        listingIds?.length
          ? inArray(productListings.id, listingIds)
          : eq(productListings.storeId, storeId),
      );

    return rows.filter((r) => r.url && r.externalId) as ListingTarget[];
  }

  private async updateCrawlJob(
    crawlJobId: string,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'dead',
    extras: Partial<{
      errorLog: string;
      urlsAttempted: number;
      urlsSucceeded: number;
      urlsFailed: number;
      startedAt: Date;
      completedAt: Date;
    }> = {},
  ): Promise<void> {
    await this.db
      .update(crawlJobs)
      .set({ status, ...extras })
      .where(eq(crawlJobs.id, crawlJobId));
  }

  async onModuleDestroy(): Promise<void> {
    const adapters = this.adapterFactory.getAllAdapters();
    await Promise.allSettled(
      adapters.map((adapter) => {
        if ('closeBrowser' in adapter) {
          return (adapter as { closeBrowser: () => Promise<void> }).closeBrowser();
        }
      }),
    );
  }
}
