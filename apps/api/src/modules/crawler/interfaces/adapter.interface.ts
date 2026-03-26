export interface ScrapeResult {
  externalId: string;      // store's own product ID (ASIN, item number, etc.)
  url: string;
  price: number;
  currency: string;
  inStock: boolean;
  scrapedAt: Date;
  // Optional enrichment returned by adapter for new product creation
  productName?: string;
  brand?: string;
  imageUrl?: string;
  // Store's advertised list/MSRP price (strikethrough "was" price on product page)
  originalPrice?: number;
}

export interface ListingTarget {
  listingId: string;
  url: string;
  externalId: string;
}

export interface AdapterResult {
  succeeded: ScrapeResult[];
  failed: FailedUrl[];
}

export interface FailedUrl {
  url: string;
  listingId?: string;
  reason: string;
  retryable: boolean;
}

export interface ISiteAdapter {
  readonly storeName: string;
  readonly storeId: string;

  /**
   * Scrape a batch of known listing URLs.
   * Used for regular price refresh jobs.
   */
  scrapeListings(targets: ListingTarget[]): Promise<AdapterResult>;

  /**
   * Scrape raw URLs without pre-existing listing records.
   * Used during discovery to get product details + prices for new URLs.
   */
  scrapeUrls(urls: string[]): Promise<ScrapeResult[]>;

  /**
   * Discover new product URLs from category pages.
   * Used for catalog expansion jobs.
   */
  discoverProductUrls?(categorySlug: string): Promise<string[]>;
}
