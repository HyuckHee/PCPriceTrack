import { BrowserContext } from 'playwright';
import { AbortError, BaseSiteAdapter } from './base.adapter';
import { ListingTarget, ScrapeResult } from '../interfaces/adapter.interface';

/**
 * Newegg adapter.
 *
 * Price selector strategy (in priority order):
 *   1. li.price-current strong + sup + span  (main price)
 *   2. .price-was-map                         (MAP/sale price)
 *   3. JSON-LD structured data                (fallback)
 *
 * Stock status: Newegg renders "Add to Cart" or "Auto-Notify" / "OUT OF STOCK".
 * External ID: the item number in URL (e.g. N82E16814137743).
 */
export class NeweggAdapter extends BaseSiteAdapter {
  protected async scrapePage(
    context: BrowserContext,
    target: ListingTarget,
  ): Promise<ScrapeResult> {
    const page = await this.openPage(context, target.url);

    try {
      // ── Bot / CAPTCHA detection ────────────────────────────────────────
      if (this.isCaptchaPage(page)) {
        throw new AbortError(`CAPTCHA encountered at ${target.url}`);
      }

      // Detect Newegg's "Access Denied" page
      const title = await page.title();
      if (title.toLowerCase().includes('access denied') || title.toLowerCase().includes('robot')) {
        throw new AbortError(`Access denied at ${target.url}`);
      }

      // ── Price extraction ───────────────────────────────────────────────
      let price: number | null = null;
      let confidence: 'high' | 'medium' | 'low' = 'low';

      // Strategy 1: main price block (whole + fraction)
      const priceWhole = await page.$('.price-current strong');
      const priceSup   = await page.$('.price-current > sup');
      const priceSub   = await page.$('.price-current > span');

      if (priceWhole) {
        const wholeText = (await priceWhole.innerText()).replace(/[^0-9]/g, '');
        const supText   = priceSup ? (await priceSup.innerText()).replace(/[^0-9]/g, '') : '00';
        const subText   = priceSub ? (await priceSub.innerText()).replace(/[^0-9.]/g, '') : '';
        const cents = subText || supText;
        price      = parseFloat(`${wholeText}.${cents.padStart(2, '0')}`);
        confidence = 'medium';
      }

      // Strategy 2: JSON-LD structured data
      if (!price) {
        const ldJson = await page.$('script[type="application/ld+json"]');
        if (ldJson) {
          try {
            const json   = JSON.parse(await ldJson.innerText()) as Record<string, unknown>;
            const offers = json['offers'] as Record<string, unknown> | undefined;
            const offerPrice = offers?.['price'];
            if (offerPrice) {
              price      = parseFloat(String(offerPrice));
              confidence = 'high';
            }
          } catch {
            // malformed JSON-LD — continue
          }
        }
      }

      if (!price || isNaN(price) || price <= 0) {
        throw new Error(`Could not extract price from ${target.url}`);
      }

      // ── Stock status ───────────────────────────────────────────────────
      const addToCartBtn = await page.$('button.btn-primary:has-text("Add to Cart")');
      const outOfStockEl = await page.$('.product-inventory:has-text("OUT OF STOCK")');
      const autoNotifyEl = await page.$('.product-inventory:has-text("Auto-Notify")');

      const inStock = Boolean(addToCartBtn) && !outOfStockEl && !autoNotifyEl;

      // ── External ID from URL ───────────────────────────────────────────
      // Newegg URLs: /p/N82E16814137743 or ?Item=N82E16814137743
      const itemMatch =
        target.url.match(/\/p\/(N82E\d+)/i) ??
        target.url.match(/[?&]Item=(N82E\d+)/i);
      const externalId = itemMatch?.[1] ?? target.externalId;

      // ── Product name (for new product creation) ────────────────────────
      const nameEl = await page.$('h1.product-title');
      const productName = nameEl ? (await nameEl.innerText()).trim() : undefined;

      // ── Brand ─────────────────────────────────────────────────────────
      const brandEl = await page.$('.product-flag-brand a, .product-brand a');
      const brand = brandEl ? (await brandEl.innerText()).trim() : undefined;

      // ── Original/List price (취소선 정가) ─────────────────────────────
      let originalPrice: number | undefined;
      const wasPriceText = await page
        .$eval('.price-was-data, .price-old', (el: Element) => el.textContent?.trim() ?? '')
        .catch(() => '');
      if (wasPriceText) {
        const val = parseFloat(wasPriceText.replace(/[^0-9.]/g, ''));
        if (!isNaN(val) && val > price) originalPrice = val;
      }

      // ── Image URL ─────────────────────────────────────────────────────
      const imageUrl = await page
        .$eval('.product-view-img-original, .product-img-wrap img', (el: HTMLImageElement) => el.src)
        .catch(() => undefined);

      return {
        externalId,
        url: target.url,
        price,
        originalPrice,
        currency: 'USD',
        inStock,
        scrapedAt: new Date(),
        productName,
        brand,
        imageUrl,
        confidence,
      };
    } finally {
      await page.close();
    }
  }

  async discoverProductUrls(categorySlug: string): Promise<string[]> {
    const categoryMap: Record<string, string> = {
      gpu: 'https://www.newegg.com/Desktop-Graphics-Cards/SubCategory/ID-48',
      cpu: 'https://www.newegg.com/Processors-Desktops/SubCategory/ID-343',
      ram: 'https://www.newegg.com/Desktop-Memory/SubCategory/ID-147',
      ssd: 'https://www.newegg.com/SSDs/SubCategory/ID-636',
      motherboard: 'https://www.newegg.com/Motherboards/Category/ID-22',
    };

    const categoryUrl = categoryMap[categorySlug];
    if (!categoryUrl) return [];

    const context = await this.createContext().catch((err) => {
      if (this.isChromiumUnavailable()) return null;
      throw err as Error;
    });
    if (!context) {
      this.logger.warn(`[Newegg] discoverProductUrls 건너뜀 — Chromium 미설치 환경`);
      return [];
    }
    const urls: string[] = [];

    try {
      const page = await this.openPage(context, categoryUrl);

      if (this.isCaptchaPage(page)) {
        this.logger.warn(`CAPTCHA on discovery page: ${categoryUrl}`);
        return [];
      }

      // Collect product links from listing page
      const links = await page.$$eval(
        'a.item-title',
        (anchors: HTMLAnchorElement[]) =>
          anchors.map((a) => a.href).filter((href) => href.includes('/p/')),
      );

      urls.push(...links);
      this.logger.log(
        `Discovered ${urls.length} URLs for category "${categorySlug}" on Newegg`,
      );
    } catch (err) {
      this.logger.error(`Discovery failed for ${categorySlug}: ${(err as Error).message}`);
    } finally {
      await context?.close();
    }

    return urls;
  }
}
