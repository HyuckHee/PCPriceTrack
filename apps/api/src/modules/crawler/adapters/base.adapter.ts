import { Logger } from '@nestjs/common';
import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { AdapterResult, FailedUrl, ISiteAdapter, ListingTarget, ScrapeResult } from '../interfaces/adapter.interface';

/** Non-retryable error — thrown inside withRetry to abort all remaining attempts. */
export class AbortError extends Error {
  readonly name = 'AbortError';
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, AbortError.prototype);
  }
}

// Rotated on each browser context to blend with organic traffic
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

export interface AdapterConfig {
  storeId: string;
  storeName: string;
  /** Max parallel pages open in the same browser context */
  concurrency?: number;
  /** Milliseconds to wait between page requests (randomized ±50%) */
  requestDelay?: number;
  /** Retry attempts per individual URL before marking as failed */
  maxRetries?: number;
  /** Optional proxy URL e.g. http://user:pass@host:port */
  proxyUrl?: string;
}

export abstract class BaseSiteAdapter implements ISiteAdapter {
  protected readonly logger: Logger;
  private browser: Browser | null = null;

  readonly storeName: string;
  readonly storeId: string;

  protected readonly concurrency: number;
  protected readonly requestDelay: number;
  protected readonly maxRetries: number;
  protected readonly proxyUrl: string | undefined;

  constructor(config: AdapterConfig) {
    this.storeId = config.storeId;
    this.storeName = config.storeName;
    this.concurrency = config.concurrency ?? 2;
    this.requestDelay = config.requestDelay ?? 2000;
    this.maxRetries = config.maxRetries ?? 3;
    this.proxyUrl = config.proxyUrl;
    this.logger = new Logger(`Adapter:${config.storeName}`);
  }

  // ─── Browser lifecycle ────────────────────────────────────────────────────

  protected async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({
        headless: true,
        proxy: this.proxyUrl ? { server: this.proxyUrl } : undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });
    }
    return this.browser;
  }

  protected async createContext(): Promise<BrowserContext> {
    const browser = await this.getBrowser();
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    const context = await browser.newContext({
      userAgent,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      viewport: { width: 1280 + Math.floor(Math.random() * 200), height: 800 },
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
    });

    // Erase automation fingerprints in every new page
    await context.addInitScript(() => {
      // Hide webdriver flag
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // Spoof plugins length (0 plugins is a bot signal)
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
      // Spoof language
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });

    return context;
  }

  async closeBrowser(): Promise<void> {
    if (this.browser?.isConnected()) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // ─── Concurrency helpers ──────────────────────────────────────────────────

  /**
   * Process an array of items with a bounded concurrency pool.
   * Uses a manual sliding-window worker approach (no external dependencies).
   */
  protected async runConcurrent<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
  ): Promise<PromiseSettledResult<R>[]> {
    const results: PromiseSettledResult<R>[] = new Array(items.length);
    let idx = 0;

    const worker = async (): Promise<void> => {
      while (idx < items.length) {
        const i = idx++;
        results[i] = await fn(items[i])
          .then((value) => ({ status: 'fulfilled' as const, value }))
          .catch((reason: unknown) => ({ status: 'rejected' as const, reason }));
      }
    };

    const workerCount = Math.min(this.concurrency, items.length);
    await Promise.all(Array.from({ length: workerCount }, worker));
    return results;
  }

  // ─── Retry helpers ────────────────────────────────────────────────────────

  /**
   * Wraps a page scrape with exponential backoff retry.
   * Throws AbortError for non-retryable conditions (e.g. 404, CAPTCHA detected).
   */
  protected async withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error = new Error('unknown');

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err as Error;
        if (err instanceof AbortError) throw err;
        if (attempt < this.maxRetries) {
          const base = 3_000 * Math.pow(2, attempt);
          const delay = Math.min(base * (0.5 + Math.random()), 30_000);
          this.logger.warn(
            `[${context}] Attempt ${attempt + 1}/${this.maxRetries + 1} failed: ${lastError.message}. Retry in ${Math.round(delay)}ms`,
          );
          await new Promise<void>((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Jittered delay between requests to mimic human browsing patterns.
   */
  protected async sleep(): Promise<void> {
    const jitter = (Math.random() - 0.5) * this.requestDelay;
    const delay = Math.max(500, this.requestDelay + jitter);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // ─── Page helpers ─────────────────────────────────────────────────────────

  protected async openPage(context: BrowserContext, url: string): Promise<Page> {
    const page = await context.newPage();

    // Block image/font/media loading to save bandwidth and speed up scraping
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    return page;
  }

  protected isCaptchaPage(page: Page): boolean {
    const url = page.url();
    return (
      url.includes('captcha') ||
      url.includes('robot') ||
      url.includes('challenge') ||
      url.includes('validateCaptcha')
    );
  }

  // ─── Abstract methods (implemented per store) ─────────────────────────────

  /**
   * Scrape a single product URL. Implementations should:
   * 1. Open page with this.openPage()
   * 2. Check for captcha with this.isCaptchaPage() and throw AbortError if hit
   * 3. Extract price, stock, externalId
   * 4. Close the page after scraping
   */
  protected abstract scrapePage(
    context: BrowserContext,
    target: ListingTarget,
  ): Promise<ScrapeResult>;

  // ─── Main entrypoints ─────────────────────────────────────────────────────

  /**
   * Scrape raw URLs (no existing listing needed).
   * Used during discovery to get product details + prices for new URLs.
   */
  async scrapeUrls(urls: string[]): Promise<ScrapeResult[]> {
    const targets: ListingTarget[] = urls.map((url) => ({
      listingId: 'discovery',
      url,
      externalId: '',
    }));
    const { succeeded } = await this.scrapeListings(targets);
    return succeeded;
  }

  async scrapeListings(targets: ListingTarget[]): Promise<AdapterResult> {
    const context = await this.createContext();
    const succeeded: ScrapeResult[] = [];
    const failed: FailedUrl[] = [];

    try {
      const results = await this.runConcurrent(targets, async (target) => {
        try {
          const result = await this.withRetry(
            () => this.scrapePage(context, target),
            `${target.url}`,
          );
          succeeded.push(result);
          await this.sleep();
          return result;
        } catch (err) {
          const error = err as Error;
          const isAbort = err instanceof AbortError;
          failed.push({
            url: target.url,
            listingId: target.listingId,
            reason: error.message,
            retryable: !isAbort,
          });
          this.logger.error(
            `Failed to scrape ${target.url}: ${error.message}`,
          );
        }
      });

      this.logger.log(
        `[${this.storeName}] Scraped ${succeeded.length}/${targets.length} listings. Failed: ${failed.length}`,
      );

      return { succeeded, failed };
    } finally {
      await context.close();
    }
  }
}
