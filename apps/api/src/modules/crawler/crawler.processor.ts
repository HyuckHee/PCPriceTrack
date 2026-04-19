import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { DATABASE_TOKEN, Database } from '../../database/database.provider';
import { categories, crawlJobs, productListings, products } from '../../database/schema';
import { productGroups } from '../../database/schema/product-groups';
import { AdapterFactory } from './adapters/adapter.factory';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { PriceIngestionService } from './services/price-ingestion.service';
import { SpecExtractionService } from './services/spec-extraction.service';
import { BenchmarkMatchService } from './services/benchmark-match.service';
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
    private readonly specExtraction: SpecExtractionService,
    private readonly benchmarkMatch: BenchmarkMatchService,
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

    // ─── discoverProducts() 경로 (Naver 등 API 기반 어댑터) ─────────────────
    // 검색 결과에 상품 데이터가 이미 포함돼 있어 scrapeUrls() 2단계가 불필요
    if (adapter.discoverProducts) {
      const allResults = await adapter.discoverProducts(categorySlug!);

      if (allResults.length === 0) {
        this.logger.warn(`No products discovered for category ${categorySlug} on store ${storeId}`);
        await this.updateCrawlJob(crawlJobId, 'completed', {
          urlsAttempted: 0, urlsSucceeded: 0, urlsFailed: 0, completedAt: new Date(),
        });
        return { crawlJobId, urlsAttempted: 0, urlsSucceeded: 0, urlsFailed: 0 };
      }

      // 이미 DB에 있는 externalId 필터링
      const existing = await this.db
        .select({ externalId: productListings.externalId })
        .from(productListings)
        .where(eq(productListings.storeId, storeId));
      const knownExternals = new Set(existing.map((l) => l.externalId).filter(Boolean));

      const newResults = allResults.filter((r) => r.externalId && !knownExternals.has(r.externalId));

      this.logger.log(
        `[Discovery] ${allResults.length} discovered, ${newResults.length} new for category=${categorySlug}`,
      );

      if (newResults.length === 0) {
        await this.updateCrawlJob(crawlJobId, 'completed', {
          urlsAttempted: 0, urlsSucceeded: 0, urlsFailed: 0, completedAt: new Date(),
        });
        return { crawlJobId, urlsAttempted: 0, urlsSucceeded: 0, urlsFailed: 0 };
      }

      const [category] = await this.db
        .select()
        .from(categories)
        .where(eq(categories.slug, categorySlug!));

      if (!category) {
        const err = `Category not found: ${categorySlug}`;
        await this.updateCrawlJob(crawlJobId, 'failed', { errorLog: err });
        throw new Error(err);
      }

      const scrapeResults = newResults;
      const failedCount = 0;

      // → 공통 upsert 루프로 진행 (아래 코드 재사용)
      return await this.upsertDiscoveryResults(
        storeId, crawlJobId, job.id, categorySlug!, category,
        scrapeResults, newResults.length, failedCount,
      );
    }

    // ─── 기존 2단계 경로 (Playwright 기반 어댑터) ───────────────────────────
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

    // 2. URL 정규화 (트래킹 파라미터 제거)
    const cleanUrl = (raw: string): string => {
      try {
        const u = new URL(raw);
        const TRACKING = [
          'dib','dib_tag','qid','sr','ref','ref_','tag',
          'pf_rd_p','pf_rd_r','pf_rd_s','pf_rd_t','pf_rd_i','pf_rd_m',
          '_encoding','sprefix','crid','keywords','s',
          'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
          'fbclid','gclid','msclkid',
        ];
        TRACKING.forEach((p) => u.searchParams.delete(p));
        return u.toString();
      } catch {
        return raw;
      }
    };
    const normalizedUrls = urls.map(cleanUrl);

    // 3. Filter out URLs already in DB (URL + externalId 2단계 중복 체크)
    const existing = await this.db
      .select({ url: productListings.url, externalId: productListings.externalId })
      .from(productListings)
      .where(eq(productListings.storeId, storeId));

    const knownUrls      = new Set(existing.map((l) => l.url));
    const knownExternals = new Set(existing.map((l) => l.externalId).filter(Boolean));

    // externalId 추출 헬퍼 (Amazon ASIN, Newegg item 번호 등)
    const extractExternalId = (url: string): string | null =>
      url.match(/\/dp\/([A-Z0-9]{10})/i)?.[1] ??        // Amazon ASIN
      url.match(/\/p\/(N82E\d+)/i)?.[1] ??               // Newegg item
      url.match(/\/catalog\/(\d+)/)?.[1] ??               // Naver catalog
      null;

    const newUrls = normalizedUrls.filter((u) => {
      if (knownUrls.has(u)) return false;
      const eid = extractExternalId(u);
      if (eid && knownExternals.has(eid)) return false;
      return true;
    });

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

    return await this.upsertDiscoveryResults(
      storeId, crawlJobId, job.id, categorySlug!, category,
      scrapeResults, newUrls.length, failedCount,
    );
  }

  /** Discovery 결과를 DB에 upsert하고 가격을 수집. 두 discovery 경로(URL 기반/직접)에서 공유 */
  private async upsertDiscoveryResults(
    storeId: string,
    crawlJobId: string,
    jobId: string | number,
    categorySlug: string,
    category: { id: string },
    scrapeResults: import('./interfaces/adapter.interface').ScrapeResult[],
    urlsAttempted: number,
    failedCount: number,
  ): Promise<CrawlJobResult> {
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
            // 신규 제품에 한해 스펙 추출 비동기 실행 (실패해도 ingestion 흐름 유지)
            this.specExtraction
              .extractAndSave({
                productId,
                storeName: this.adapterFactory.getAdapter(storeId)?.storeName ?? '',
                categorySlug,
                raw: {
                  productName: result.productName,
                  specTable: (result as unknown as Record<string, unknown>).specTable as Record<string, string> | undefined,
                  description: (result as unknown as Record<string, unknown>).description as string | undefined,
                },
              })
              .catch((err: Error) =>
                this.logger.error(`SpecExtraction 실패: product=${productId} ${err.message}`),
              );
            this.benchmarkMatch
              .matchAndSave(productId, result.productName ?? '', categorySlug)
              .catch((err: Error) =>
                this.logger.error(`BenchmarkMatch 실패: product=${productId} ${err.message}`),
              );
          } else {
            const [existing] = await this.db
              .select({ id: products.id })
              .from(products)
              .where(eq(products.slug, slug));
            if (!existing) continue;
            productId = existing.id;
          }

          // ── 자동 그룹화: 동일 model이 다른 스토어에 존재하면 같은 그룹으로 뮳음 ────
          await this.autoGroupByModel(productId, result.externalId, name, result.imageUrl);

          // Insert listing (ignore conflict on store_id + external_id)
          const insertedListing = await this.db
            .insert(productListings)
            .values({ productId, storeId, externalId: result.externalId, url: result.url, mallName: result.mallName })
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
      urlsAttempted,
      urlsSucceeded: succeeded,
      urlsFailed: failedCount + (scrapeResults.length - succeeded),
      completedAt: new Date(),
    });

    this.logger.log(
      `Discovery job ${jobId} done | created/updated=${succeeded} | failed=${failedCount}`,
    );

    return {
      crawlJobId,
      urlsAttempted,
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

        // imageUrl이 새로 수집됐고 기존 값이 없으면 업데이트
        if (result.imageUrl) {
          const [listing] = await this.db
            .select({ productId: productListings.productId })
            .from(productListings)
            .where(eq(productListings.id, target.listingId));
          if (listing) {
            await this.db
              .update(products)
              .set({ imageUrl: result.imageUrl })
              .where(and(eq(products.id, listing.productId), eq(products.imageUrl, null as unknown as string)));
          }
        }
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
        productName: products.name,
      })
      .from(productListings)
      .leftJoin(products, eq(productListings.productId, products.id))
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

  /**
   * 동일한 externalId를 가진 다른 store의 product가 있으면 같은 group으로 묶습니다.
   * 예: Naver의 nvMid와 11번가의 prdNo가 우연히 같을 때 (실제론 드물지만 안전장치).
   * 주로 어드민 /products/merge 엔드포인트로 수동 그룹화를 권장합니다.
   */
  private async autoGroupByModel(
    productId: string,
    externalId: string,
    name: string,
    imageUrl?: string | null,
  ): Promise<void> {
    try {
      // 같은 externalId를 가진 다른 product 조회
      const others = await this.db
        .select({ productId: productListings.productId, groupId: products.groupId })
        .from(productListings)
        .innerJoin(products, eq(productListings.productId, products.id))
        .where(
          and(
            eq(productListings.externalId, externalId),
            ne(productListings.productId, productId),
          ),
        );

      if (others.length === 0) return;

      // 이미 그룹이 있으면 재사용, 없으면 생성
      const existingGroupId = others.find((o) => o.groupId)?.groupId;
      let groupId: string;

      if (existingGroupId) {
        groupId = existingGroupId;
      } else {
        const slug = this.toSlug(`${name}-${externalId}-group`).slice(0, 350);
        const [newGroup] = await this.db
          .insert(productGroups)
          .values({ name, slug, imageUrl: imageUrl ?? undefined })
          .onConflictDoNothing()
          .returning({ id: productGroups.id });

        if (!newGroup) return; // slug 충돌 시 skip
        groupId = newGroup.id;

        for (const other of others) {
          await this.db
            .update(products)
            .set({ groupId, updatedAt: new Date() })
            .where(eq(products.id, other.productId));
        }
      }

      await this.db
        .update(products)
        .set({ groupId, updatedAt: new Date() })
        .where(eq(products.id, productId));
    } catch (err) {
      this.logger.warn(`[autoGroupByModel] ${externalId}: ${(err as Error).message}`);
    }
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
