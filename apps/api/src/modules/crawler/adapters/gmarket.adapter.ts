import { BrowserContext } from 'playwright';
import { AbortError, BaseSiteAdapter } from './base.adapter';
import { ListingTarget, ScrapeResult } from '../interfaces/adapter.interface';

/**
 * G마켓 어댑터.
 *
 * 가격 선택자:
 *   1. .price-seller strong           (판매가)
 *   2. .price-real strong             (정가)
 *   3. JSON-LD                        (fallback)
 *
 * 외부 ID: URL의 goodscode 파라미터
 * 통화: KRW
 */
export class GmarketAdapter extends BaseSiteAdapter {
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
      if (!title || title.includes('오류') || title.includes('error')) {
        throw new AbortError(`Error page at ${target.url}`);
      }

      // ── 가격 추출 ────────────────────────────────────────────────────
      let price: number | null = null;

      // Strategy 1: 판매가
      const sellerPriceEl = await page.$('.price-seller strong, .itemtit_price strong');
      if (sellerPriceEl) {
        const text = (await sellerPriceEl.innerText()).replace(/[^0-9]/g, '');
        if (text) price = parseInt(text, 10);
      }

      // Strategy 2: 즉시구매가
      if (!price) {
        const buyPriceEl = await page.$('.buy-price strong, .deal_price em');
        if (buyPriceEl) {
          const text = (await buyPriceEl.innerText()).replace(/[^0-9]/g, '');
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
      const cartBtn = await page.$('button.btn-cart, .btn_cart, #btnCart');
      const soldOut = await page.$('.ico-soldout, .soldout_layer');
      const inStock = Boolean(cartBtn) && !soldOut;

      // ── 외부 ID ──────────────────────────────────────────────────────
      const goodsMatch =
        target.url.match(/[?&]goodscode=(\d+)/) ??
        target.url.match(/\/(\d{7,})/);
      const externalId = goodsMatch?.[1] ?? target.externalId;

      // ── 상품명 ───────────────────────────────────────────────────────
      const nameEl = await page.$('h1.itemtit, .item_title h2, h1[class*="title"]');
      const productName = nameEl ? (await nameEl.innerText()).trim() : undefined;

      // ── 브랜드 ───────────────────────────────────────────────────────
      const brandEl = await page.$('.brand-name, .seller_id');
      const brand = brandEl ? (await brandEl.innerText()).trim() : undefined;

      // ── 이미지 ───────────────────────────────────────────────────────
      const imageUrl = await page
        .$eval('#mainImg, .itemthumb img, .item_photo_wrap img', (el: HTMLImageElement) => el.src)
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
    // G마켓은 JavaScript 기반 봇 탐지(대기 페이지)로 headless 크롤링을 차단합니다.
    // "잠시만 기다리십시오…" 페이지에서 멈추며 상품 목록으로 진입 불가.
    // Playwright stealth 설정 강화 또는 프록시 적용 후 재시도 필요합니다.
    this.logger.warn(
      `G마켓 Discovery 건너뜀 (${categorySlug}): JS 봇 탐지 차단 — "잠시만 기다리십시오" 페이지. ` +
      `상품 URL을 수동으로 등록하거나 stealth 강화 후 재시도하세요.`,
    );
    return [];
  }
}
