import { Logger } from '@nestjs/common';
import { AdapterResult, ISiteAdapter, ListingTarget, ScrapeResult } from '../interfaces/adapter.interface';

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
   * externalId(nvMid)로 검색 → 최신 lprice 반환.
   */
  async scrapeListings(targets: ListingTarget[]): Promise<AdapterResult> {
    const succeeded: ScrapeResult[] = [];
    const failed: import('../interfaces/adapter.interface').FailedUrl[] = [];

    for (const target of targets) {
      try {
        await this.sleep();
        const result = await this.scrapeOne(target);
        succeeded.push(result);
      } catch (err) {
        const error = err as Error;
        this.logger.warn(`[${target.url}] 가격 조회 실패: ${error.message}`);
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
   * URL 목록에서 가격 추출 (Discovery 후 상세 조회).
   */
  async scrapeUrls(urls: string[]): Promise<ScrapeResult[]> {
    const targets: ListingTarget[] = urls.map(url => ({
      listingId: 'discovery',
      url,
      externalId: this.extractNvMid(url) ?? '',
    }));
    const { succeeded } = await this.scrapeListings(targets);
    return succeeded;
  }

  /**
   * 카테고리별 신규 상품 URL 목록 반환.
   * Naver API 검색 결과 → catalog URL 형식으로 정규화.
   */
  async discoverProductUrls(categorySlug: string): Promise<string[]> {
    const keywords = CATEGORY_KEYWORDS[categorySlug];
    if (!keywords?.length) {
      this.logger.warn(`카테고리 "${categorySlug}" 키워드 없음`);
      return [];
    }

    const seen = new Set<string>();
    const urls: string[] = [];

    for (const keyword of keywords) {
      try {
        await this.sleep();
        const data = await this.searchProducts(keyword, 100, 1, 'sim');

        for (const item of data.items) {
          const nvMid = item.productId;
          if (!nvMid || seen.has(nvMid)) continue;
          seen.add(nvMid);
          urls.push(`https://search.shopping.naver.com/catalog/${nvMid}`);
        }

        this.logger.log(
          `[Discovery] "${keyword}" → ${data.items.length}건 (누적 ${urls.length}개)`,
        );
      } catch (err) {
        const error = err as Error;
        this.logger.error(`[Discovery] "${keyword}" 검색 실패: ${error.message}`);
      }
    }

    this.logger.log(
      `[네이버쇼핑 API] Discovery [${categorySlug}] 완료 → ${urls.length}개 URL`,
    );
    return urls;
  }

  // ─── 내부 헬퍼 ──────────────────────────────────────────────────────────

  private async scrapeOne(target: ListingTarget): Promise<ScrapeResult> {
    const nvMid = target.externalId || this.extractNvMid(target.url);
    if (!nvMid) {
      throw new Error(`nvMid를 추출할 수 없음: ${target.url}`);
    }

    // nvMid로 검색 → 일치 상품 찾기
    const data = await this.searchProducts(nvMid, 10, 1, 'sim');
    const item = data.items.find(i => i.productId === nvMid) ?? data.items[0];

    if (!item) {
      throw new Error(`nvMid ${nvMid} 에 해당하는 상품 없음`);
    }

    const price = parseInt(item.lprice, 10);
    if (!price || isNaN(price) || price <= 0) {
      throw new Error(`유효하지 않은 가격: lprice="${item.lprice}"`);
    }

    return {
      externalId: item.productId,
      url: `https://search.shopping.naver.com/catalog/${item.productId}`,
      price,
      currency: 'KRW',
      inStock: true, // lprice 존재 = 판매 중
      scrapedAt: new Date(),
      productName: stripHtml(item.title),
      brand: item.brand || item.maker || undefined,
      imageUrl: item.image || undefined,
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
