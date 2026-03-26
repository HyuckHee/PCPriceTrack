import { BrowserContext } from 'playwright';
import { AbortError, BaseSiteAdapter } from './base.adapter';
import { ListingTarget, ScrapeResult } from '../interfaces/adapter.interface';

/**
 * 네이버쇼핑 어댑터.
 *
 * 네이버쇼핑은 가격 비교 집계 서비스로, 개별 상품 페이지에서
 * 최저가(최저가 판매처 기준)를 추출합니다.
 *
 * 가격 선택자:
 *   1. .price_num                     (최저가)
 *   2. ._lowest_price strong          (최저가 강조)
 *   3. JSON-LD                        (fallback)
 *
 * 외부 ID: URL의 nvMid 파라미터
 * 통화: KRW
 */
export class NaverShoppingAdapter extends BaseSiteAdapter {
  protected async scrapePage(
    context: BrowserContext,
    target: ListingTarget,
  ): Promise<ScrapeResult> {
    const page = await this.openPage(context, target.url);

    try {
      if (this.isCaptchaPage(page)) {
        throw new AbortError(`CAPTCHA encountered at ${target.url}`);
      }

      const title = await page.title();
      if (!title) {
        throw new AbortError(`Empty page at ${target.url}`);
      }

      // ── 가격 추출 ────────────────────────────────────────────────────
      let price: number | null = null;

      // Strategy 1: 최저가 영역
      const priceEl = await page.$(
        '.price_num, ._lowest_price strong, .lowestPrice_price__mElbT',
      );
      if (priceEl) {
        const text = (await priceEl.innerText()).replace(/[^0-9]/g, '');
        if (text) price = parseInt(text, 10);
      }

      // Strategy 2: 가격 정보 영역 (상품 상세)
      if (!price) {
        const detailEl = await page.$('.price___WXHHc strong, .prod_price strong');
        if (detailEl) {
          const text = (await detailEl.innerText()).replace(/[^0-9]/g, '');
          if (text) price = parseInt(text, 10);
        }
      }

      // Strategy 3: JSON-LD
      if (!price) {
        const ldJson = await page.$('script[type="application/ld+json"]');
        if (ldJson) {
          try {
            const json = JSON.parse(await ldJson.innerText()) as Record<string, unknown>;
            const offers = json['offers'] as Record<string, unknown> | undefined;
            if (offers?.['price']) price = parseFloat(String(offers['price']));
          } catch { /* malformed */ }
        }
      }

      if (!price || isNaN(price) || price <= 0) {
        throw new Error(`Could not extract price from ${target.url}`);
      }

      // ── 재고 (네이버쇼핑은 기본적으로 판매 중인 상품만 표시) ─────────
      const unavailable = await page.$('.outOfStock, .soldout_ico');
      const inStock = !unavailable;

      // ── 외부 ID (nvMid) ──────────────────────────────────────────────
      const nvMidMatch = target.url.match(/[?&]nvMid=(\d+)/);
      const externalId = nvMidMatch?.[1] ?? target.externalId;

      // ── 상품명 ───────────────────────────────────────────────────────
      const nameEl = await page.$('h1.prod_tit, .prod_name h2, ._prod_tit_info h1');
      const productName = nameEl ? (await nameEl.innerText()).trim() : undefined;

      // ── 브랜드 ───────────────────────────────────────────────────────
      const brandEl = await page.$('.prod_brand, .brand_area a');
      const brand = brandEl ? (await brandEl.innerText()).trim() : undefined;

      // ── 이미지 ───────────────────────────────────────────────────────
      const imageUrl = await page
        .$eval('.prod_img img, ._productImage img', (el: HTMLImageElement) => el.src)
        .catch(() => undefined);

      return {
        externalId,
        url: target.url,
        price,
        currency: 'KRW',
        inStock,
        scrapedAt: new Date(),
        productName,
        brand,
        imageUrl,
      };
    } finally {
      await page.close();
    }
  }

  async discoverProductUrls(categorySlug: string): Promise<string[]> {
    // 네이버쇼핑 검색 결과 페이지는 React SPA로 구성되며,
    // headless 브라우저에서 콘텐츠가 렌더링되지 않아 상품 링크를 수집할 수 없습니다.
    // Naver Shopping API(developers.naver.com) 연동 또는
    // 상품 URL을 수동 등록하는 방식으로 전환 필요합니다.
    this.logger.warn(
      `네이버쇼핑 Discovery 건너뜀 (${categorySlug}): SPA 렌더링 차단 — ` +
      `검색 결과 링크 0개. Naver Shopping API 연동을 권장합니다.`,
    );
    return [];
  }
}
