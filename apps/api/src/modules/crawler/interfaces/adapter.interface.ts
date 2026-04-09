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
  /**
   * 네이버쇼핑 등 멀티몰 플랫폼에서 실제 상품이 올라온 쇼핑몰 이름.
   * 예: "G마켓", "11번가", "스마트스토어"
   */
  mallName?: string;
  /**
   * 가격 파싱 신뢰도
   *  'high'   — 공식 API 또는 JSON-LD / meta 속성 기반 (정확도 높음)
   *  'medium' — 주요 DOM 셀렉터 기반 (일반적으로 신뢰 가능)
   *  'low'    — 휴리스틱 fallback (검토 필요할 수 있음)
   */
  confidence?: 'high' | 'medium' | 'low';
}

export interface ListingTarget {
  listingId: string;
  url: string;
  externalId: string;
  /** 어댑터가 상품명 기반 검색이 필요할 때 사용 (e.g. Naver) */
  productName?: string;
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

  /**
   * Discover AND return full product data in one step.
   * REST API 기반 어댑터(네이버 등)에서 구현 — discovery 데이터를 버리지 않고 바로 반환.
   * 이 메서드가 있으면 processor가 discoverProductUrls + scrapeUrls 2단계를 건너뜀.
   */
  discoverProducts?(categorySlug: string): Promise<ScrapeResult[]>;
}
