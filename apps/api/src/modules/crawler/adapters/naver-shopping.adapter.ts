import { Logger } from '@nestjs/common';
import { AdapterResult, ISiteAdapter, ListingTarget, ScrapeResult } from '../interfaces/adapter.interface';
import { isKrBlacklisted } from './kr-blacklist';

/**
 * 네이버쇼핑 API 어댑터 (Playwright → REST API 전환)
 *
 * API: https://openapi.naver.com/v1/search/shop.json
 * 인증: X-Naver-Client-Id / X-Naver-Client-Secret 헤더
 *
 * 장점:
 *  - 브라우저 없음 → 메모리/CPU 절약
 *  - 차단 없음 (공식 API)
 *  - 속도 빠름 (JSON 직접 수신)
 *
 * 제약:
 *  - 일 10만 건 (무료 플랜)
 *  - lprice = 네이버쇼핑 최저가 (단일 판매자 가격 아님)
 */

interface NaverShopItem {
  title: string;
  link: string;
  image: string;
  lprice: string;
  hprice: string;
  mallName: string;
  productId: string;
  productType: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
}

interface NaverShopResponse {
  total: number;
  start: number;
  display: number;
  items: NaverShopItem[];
}

/**
 * 카테고리별 수집 가능한 최저가 (원).
 * 이 금액 미만 상품은 부품/액세서리로 간주하고 제외.
 */
const CATEGORY_MIN_PRICE: Record<string, number> = {
  gpu:         200_000,   // 그래픽카드 최저 20만원
  cpu:         100_000,   // CPU 최저 10만원
  ram:          30_000,   // RAM 최저 3만원
  ssd:          30_000,   // SSD 최저 3만원
  motherboard: 100_000,   // 메인보드 최저 10만원
  psu:          50_000,   // 파워 최저 5만원
  case:         30_000,   // 케이스 최저 3만원
  cooler:       20_000,   // 쿨러 최저 2만원
};

/** 카테고리별 검색 키워드 목록 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  gpu: [
    'RTX 5090 그래픽카드',
    'RTX 5080 그래픽카드',
    'RTX 4090 그래픽카드',
    'RTX 4080 그래픽카드',
    'RTX 4070 Ti 그래픽카드',
    'RTX 4070 그래픽카드',
    'RTX 4060 그래픽카드',
    'RX 7900 XTX 그래픽카드',
    'RX 7800 XT 그래픽카드',
  ],
  cpu: [
    '인텔 코어 i9 14900K',
    '인텔 코어 i7 14700K',
    '인텔 코어 i5 14600K',
    'AMD 라이젠 9 7950X',
    'AMD 라이젠 7 7700X',
    'AMD 라이젠 5 7600X',
  ],
  ram: [
    'DDR5 32GB PC5 램',
    'DDR5 16GB PC5 램',
    'DDR4 32GB 메모리',
    'DDR4 16GB 메모리',
  ],
  ssd: [
    'NVMe SSD 2TB PCIe 4.0',
    'NVMe SSD 1TB PCIe 4.0',
    'NVMe SSD 2TB PCIe 5.0',
    'SATA SSD 1TB',
  ],
  motherboard: [
    'Z790 메인보드 DDR5',
    'X670E 메인보드',
    'B650 메인보드',
    'B760 메인보드',
  ],
  psu: [
    '파워서플라이 1000W 80PLUS',
    '파워서플라이 850W 80PLUS',
    '파워서플라이 750W 80PLUS',
  ],
  case: [
    'ATX 미들타워 케이스',
    'ATX 풀타워 케이스',
    'M-ATX 케이스',
  ],
  cooler: [
    'CPU 수냉쿨러 240mm AIO',
    'CPU 수냉쿨러 360mm AIO',
    'CPU 공냉쿨러',
  ],
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

/** Naver API link 필드의 HTML 엔티티(&amp; 등) 디코딩 */
function decodeNaverLink(link: string): string {
  return link.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export class NaverShoppingApiAdapter implements ISiteAdapter {
  readonly storeName: string;
  readonly storeId: string;
  private readonly logger: Logger;
  private readonly clientId: string;
  private readonly clientSecret: string;

  /** Naver API rate limit: 10 req/s — 150ms 간격으로 안전하게 */
  private readonly REQUEST_DELAY_MS = 150;

  constructor(config: {
    storeId: string;
    storeName: string;
    clientId: string;
    clientSecret: string;
  }) {
    this.storeId = config.storeId;
    this.storeName = config.storeName;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.logger = new Logger(`Adapter:${config.storeName}`);
  }

  // ─── Naver API 호출 ──────────────────────────────────────────────────────

  private async searchProducts(
    query: string,
    display = 100,
    start = 1,
    sort: 'sim' | 'date' | 'asc' | 'dsc' = 'sim',
  ): Promise<NaverShopResponse> {
    const url = new URL('https://openapi.naver.com/v1/search/shop.json');
    url.searchParams.set('query', query);
    url.searchParams.set('display', String(display));
    url.searchParams.set('start', String(start));
    url.searchParams.set('sort', sort);

    const res = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': this.clientId,
        'X-Naver-Client-Secret': this.clientSecret,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Naver API ${res.status}: ${body}`);
    }

    return res.json() as Promise<NaverShopResponse>;
  }

  private sleep(): Promise<void> {
    return new Promise(r => setTimeout(r, this.REQUEST_DELAY_MS));
  }

  // ─── ISiteAdapter 구현 ───────────────────────────────────────────────────

  /**
   * 기존 리스팅 가격 새로고침.
   *
   * 전략: 카테고리 키워드 배치 검색으로 전체 가격 맵을 먼저 빌드 →
   *        nvMid O(1) 매핑. 맵에 없는 상품만 개별 검색 fallback.
   *
   * 장점:
   *  - N개 상품 갱신에 (키워드 수 + 미스 수)번만 API 호출 (vs 기존 N번)
   *  - 상품명 텍스트 검색 불안정성 제거
   */
  async scrapeListings(targets: ListingTarget[]): Promise<AdapterResult> {
    if (targets.length === 0) return { succeeded: [], failed: [] };

    // 1. 전체 카테고리 배치 검색으로 가격 맵 빌드
    const priceMap = await this.buildPriceMap();
    this.logger.log(`[가격갱신] 배치 맵 ${priceMap.size}개 빌드 완료, 타겟 ${targets.length}건 매핑 시작`);

    const succeeded: ScrapeResult[] = [];
    const failed: import('../interfaces/adapter.interface').FailedUrl[] = [];

    for (const target of targets) {
      const nvMid = target.externalId;
      const cached = priceMap.get(nvMid);

      if (cached) {
        // 배치 맵 히트 — URL은 기존 저장된 값 유지
        succeeded.push({ ...cached, url: target.url || cached.url });
        continue;
      }

      // 맵 미스 → 상품명으로 개별 fallback 검색
      try {
        await this.sleep();
        const result = await this.scrapeOneFallback(target);
        succeeded.push(result);
      } catch (err) {
        const error = err as Error;
        this.logger.warn(`[가격갱신 fallback 실패] nvMid=${nvMid}: ${error.message}`);
        failed.push({
          url: target.url,
          listingId: target.listingId,
          reason: error.message,
          retryable: true,
        });
      }
    }

    this.logger.log(
      `[네이버쇼핑 API] 가격 조회 ${succeeded.length}/${targets.length}건 성공, 실패 ${failed.length}건`,
    );
    return { succeeded, failed };
  }

  /**
   * URL 목록에서 가격 추출 (Playwright 기반 어댑터 호환용).
   * discoverProducts()가 있으므로 processor가 이 경로를 건너뜀.
   */
  async scrapeUrls(urls: string[]): Promise<ScrapeResult[]> {
    const map = await this.buildPriceMap();
    const results: ScrapeResult[] = [];
    for (const url of urls) {
      const nvMid = this.extractNvMid(url);
      if (nvMid && map.has(nvMid)) results.push(map.get(nvMid)!);
    }
    return results;
  }

  /**
   * 카테고리별 신규 상품 URL 목록 반환.
   */
  async discoverProductUrls(categorySlug: string): Promise<string[]> {
    const results = await this.discoverProducts(categorySlug);
    return results.map((r) => r.url);
  }

  /**
   * 카테고리 검색 결과를 ScrapeResult[] 로 직접 반환.
   * processor가 이 메서드를 감지하면 scrapeUrls() 호출을 건너뜀.
   */
  async discoverProducts(categorySlug: string): Promise<ScrapeResult[]> {
    const keywords = CATEGORY_KEYWORDS[categorySlug];
    if (!keywords?.length) {
      this.logger.warn(`카테고리 "${categorySlug}" 키워드 없음`);
      return [];
    }

    const minPrice = CATEGORY_MIN_PRICE[categorySlug] ?? 0;
    const seen = new Set<string>();
    const results: ScrapeResult[] = [];

    for (const keyword of keywords) {
      try {
        await this.sleep();
        const data = await this.searchProducts(keyword, 100, 1, 'sim');

        for (const item of data.items) {
          if (!item.productId || seen.has(item.productId)) continue;
          const result = this.itemToScrapeResult(item, minPrice);
          if (!result) continue;
          seen.add(item.productId);
          results.push(result);
        }

        this.logger.log(`[Discovery] "${keyword}" → ${data.items.length}건 (누적 ${results.length}개)`);
      } catch (err) {
        this.logger.error(`[Discovery] "${keyword}" 검색 실패: ${(err as Error).message}`);
      }
    }

    this.logger.log(`[네이버쇼핑 API] Discovery [${categorySlug}] 완료 → ${results.length}개 상품`);
    return results;
  }

  // ─── 내부 헬퍼 ──────────────────────────────────────────────────────────

  /**
   * 전체 카테고리 키워드를 순회하며 nvMid → ScrapeResult 맵 빌드.
   * scrapeListings()의 배치 검색 기반.
   */
  private async buildPriceMap(): Promise<Map<string, ScrapeResult>> {
    const map = new Map<string, ScrapeResult>();

    for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const minPrice = CATEGORY_MIN_PRICE[slug] ?? 0;
      for (const keyword of keywords) {
        try {
          await this.sleep();
          const data = await this.searchProducts(keyword, 100, 1, 'sim');

          for (const item of data.items) {
            if (!item.productId || map.has(item.productId)) continue;
            const result = this.itemToScrapeResult(item, minPrice);
            if (result) map.set(item.productId, result);
          }
        } catch (err) {
          this.logger.warn(`[buildPriceMap] "${keyword}" 실패: ${(err as Error).message}`);
        }
      }
    }

    return map;
  }

  /**
   * 배치 맵 미스 시 상품명으로 개별 검색하는 fallback.
   * display=100으로 충분한 결과를 확보해 nvMid 매칭 성공률을 높임.
   */
  private async scrapeOneFallback(target: ListingTarget): Promise<ScrapeResult> {
    const nvMid = target.externalId || this.extractNvMid(target.url);
    if (!nvMid) throw new Error(`nvMid 추출 불가: ${target.url}`);

    if (!target.productName) throw new Error(`상품명 없음 — nvMid ${nvMid} fallback 불가`);

    const data = await this.searchProducts(target.productName, 100, 1, 'sim');
    const item = data.items.find(i => i.productId === nvMid);

    if (!item) throw new Error(`nvMid ${nvMid} 미발견 (query="${target.productName}")`);

    const result = this.itemToScrapeResult(item);
    if (!result) throw new Error(`가격 이상 또는 필터링됨: lprice="${item.lprice}"`);

    return { ...result, url: target.url || result.url };
  }

  /** NaverShopItem → ScrapeResult 변환. 가격 이상·블랙리스트·최저가 미달이면 null 반환 */
  private itemToScrapeResult(item: NaverShopItem, minPrice = 0): ScrapeResult | null {
    const price = parseInt(item.lprice, 10);
    if (!price || isNaN(price) || price <= 0) return null;
    if (price < minPrice) {
      this.logger.debug(`[최저가 미달] 제외: ₩${price.toLocaleString()} < ₩${minPrice.toLocaleString()} — "${stripHtml(item.title).slice(0, 50)}"`);
      return null;
    }

    const cleanTitle = stripHtml(item.title);
    if (isKrBlacklisted(cleanTitle)) {
      this.logger.debug(`[블랙리스트] 제외: "${cleanTitle.slice(0, 60)}"`);
      return null;
    }

    return {
      externalId: item.productId,
      url: item.link ? decodeNaverLink(item.link) : `https://search.shopping.naver.com/catalog/${item.productId}`,
      price,
      currency: 'KRW',
      inStock: true,
      scrapedAt: new Date(),
      productName: stripHtml(item.title),
      brand: item.brand || item.maker || undefined,
      imageUrl: item.image || undefined,
      mallName: item.mallName || undefined,
      confidence: 'high',
    };
  }

  /** URL에서 nvMid 추출. 여러 URL 패턴 지원 */
  private extractNvMid(url: string): string | null {
    // https://search.shopping.naver.com/catalog/12345678
    const catalogMatch = url.match(/\/catalog\/(\d+)/);
    if (catalogMatch) return catalogMatch[1];

    // ?nvMid=12345678
    const nvMidMatch = url.match(/[?&]nvMid=(\d+)/);
    if (nvMidMatch) return nvMidMatch[1];

    // ?productId=12345678
    const pidMatch = url.match(/[?&]productId=(\d+)/);
    if (pidMatch) return pidMatch[1];

    return null;
  }
}
