import { BrowserContext } from 'playwright';
import { AbortError, BaseSiteAdapter } from './base.adapter';
import { ListingTarget, ScrapeResult } from '../interfaces/adapter.interface';

/**
 * 쿠팡 어댑터.
 *
 * 가격 선택자 전략:
 *   1. .prod-buy-price .price-value  (일반 상품가)
 *   2. .total-price strong           (결제 금액)
 *   3. JSON-LD structured data       (fallback)
 *
 * 재고: "장바구니 담기" 버튼 존재 여부로 판단
 * 외부 ID: URL에서 /products/(\d+) 추출
 * 통화: KRW
 */
export class CoupangAdapter extends BaseSiteAdapter {
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
      if (!title || title.toLowerCase().includes('access denied')) {
        throw new AbortError(`Access denied at ${target.url}`);
      }

      // ── 가격 추출 ────────────────────────────────────────────────────
      let price: number | null = null;

      // Strategy 1: 일반 상품 가격
      const priceEl = await page.$('.prod-buy-price .price-value, .prod-price .price-value');
      if (priceEl) {
        const text = (await priceEl.innerText()).replace(/[^0-9]/g, '');
        if (text) price = parseInt(text, 10);
      }

      // Strategy 2: 결제금액
      if (!price) {
        const totalEl = await page.$('.total-price strong, .prod-sale-price .price-value');
        if (totalEl) {
          const text = (await totalEl.innerText()).replace(/[^0-9]/g, '');
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

      // ── 재고 ─────────────────────────────────────────────────────────
      const addToCartBtn = await page.$('button.prod-cart-btn, button[name="cart"]');
      const soldOutEl = await page.$('.prod-soldout, .oos-text');
      const inStock = Boolean(addToCartBtn) && !soldOutEl;

      // ── 외부 ID ──────────────────────────────────────────────────────
      const idMatch = target.url.match(/\/products\/(\d+)/);
      const externalId = idMatch?.[1] ?? target.externalId;

      // ── 상품명 ───────────────────────────────────────────────────────
      const nameEl = await page.$('.prod-buy-header__title, h2.prod-title');
      const productName = nameEl ? (await nameEl.innerText()).trim() : undefined;

      // ── 브랜드 ───────────────────────────────────────────────────────
      const brandEl = await page.$('.prod-brand, .vendor-name');
      const brand = brandEl ? (await brandEl.innerText()).trim() : undefined;

      // ── 이미지 ───────────────────────────────────────────────────────
      const imageUrl = await page
        .$eval('.prod-image__detail img, .thumbnail-image', (el: HTMLImageElement) => el.src)
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
    // 쿠팡은 headless 브라우저 접근을 차단합니다 (Access Denied).
    // 상품 URL을 수동으로 DB에 직접 등록하거나, 프록시 설정 후 재시도하세요.
    this.logger.warn(
      `쿠팡 Discovery 건너뜀 (${categorySlug}): 봇 차단 — 카테고리 페이지 및 상품 페이지 모두 Access Denied. ` +
      `상품 URL을 수동으로 등록하거나 프록시를 사용하세요.`,
    );
    return [];
  }
}
