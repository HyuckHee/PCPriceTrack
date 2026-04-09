import { BrowserContext } from 'playwright';
import { AbortError, BaseSiteAdapter } from './base.adapter';
import { ListingTarget, ScrapeResult } from '../interfaces/adapter.interface';

/**
 * Amazon adapter.
 *
 * Amazon is the most aggressive anti-bot environment.
 * Strategy notes:
 *  - Use residential proxies in production (set proxyUrl in config)
 *  - Price is in #corePriceDisplay_desktop_feature_div or #corePrice_feature_div
 *  - CAPTCHA / Puzzlebot page: URL contains /errors/validateCaptcha or title
 *    contains "Robot Check"
 *  - ASIN extracted from URL (/dp/XXXXXXXXXX) or page meta[name="ASIN"]
 */
export class AmazonAdapter extends BaseSiteAdapter {
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

      const title = await page.title();
      if (title.toLowerCase().includes('robot check') || title === '') {
        throw new AbortError(`Bot detection triggered at ${target.url}`);
      }

      // ── Wait for price block ───────────────────────────────────────────
      await page
        .waitForSelector('#corePriceDisplay_desktop_feature_div, #corePrice_feature_div', {
          timeout: 10_000,
        })
        .catch(() => {
          /* Might not exist — handled below */
        });

      // ── Price extraction (3-strategy fallback) ─────────────────────────
      let price: number | null = null;
      let confidence: 'high' | 'medium' | 'low' = 'low';

      // Strategy 1: Core price display — scope to avoid strikethrough prices
      const priceBox = await page.$(
        '#corePriceDisplay_desktop_feature_div .a-price:not(.a-text-strike),' +
        '#corePrice_feature_div .a-price:not(.a-text-strike)',
      );
      if (priceBox) {
        const wholeEl = await priceBox.$('.a-price-whole');
        const fracEl  = await priceBox.$('.a-price-fraction');
        if (wholeEl) {
          const whole = (await wholeEl.innerText()).replace(/[^0-9]/g, '');
          const frac  = fracEl ? (await fracEl.innerText()).replace(/[^0-9]/g, '') : '00';
          if (whole) {
            price = parseFloat(`${whole}.${frac.padStart(2, '0')}`);
            confidence = 'medium';
          }
        }
      }

      // Strategy 2: JSON-LD structured data (높은 신뢰)
      if (!price) {
        const ldJson = await page.$('script[type="application/ld+json"]');
        if (ldJson) {
          try {
            const json   = JSON.parse(await ldJson.innerText()) as Record<string, unknown>;
            const offers = json['offers'] as Record<string, unknown> | undefined;
            if (offers?.['price']) {
              price      = parseFloat(String(offers['price']));
              confidence = 'high';
            }
          } catch {
            // malformed JSON-LD
          }
        }
      }

      // Strategy 3: meta[itemprop="price"] / data-a-color-price fallback
      if (!price) {
        const metaText = await page
          .$eval(
            'meta[itemprop="price"], [data-a-color-price] .a-offscreen, #priceblock_ourprice',
            (el: Element) =>
              el instanceof HTMLMetaElement
                ? el.content
                : (el.textContent?.trim() ?? ''),
          )
          .catch(() => '');
        if (metaText) {
          const val = parseFloat(metaText.replace(/[^0-9.]/g, ''));
          if (!isNaN(val) && val > 0) {
            price      = val;
            confidence = 'low';
          }
        }
      }

      if (!price || isNaN(price) || price <= 0) {
        throw new Error(`Could not extract price from ${target.url}`);
      }

      // ── Adapter-level price sanity (USD 1 ~ 7000) ─────────────────────
      if (price < 1 || price > 7_000) {
        throw new Error(
          `Price $${price} out of sanity range [1, 7000] — likely parse error at ${target.url}`,
        );
      }

      // ── Stock status ───────────────────────────────────────────────────
      // 1차: Add to Cart 버튼 존재 여부 (가장 신뢰도 높음)
      const addToCartBtn = await page.$('#add-to-cart-button');
      let inStock = Boolean(addToCartBtn);

      if (!inStock) {
        // 2차: availability span 텍스트 파싱
        const availText = await page
          .$eval(
            '#availability span, #outOfStock',
            (el: Element) => el.textContent?.toLowerCase().trim() ?? '',
          )
          .catch(() => '');
        inStock =
          availText.includes('in stock') ||
          availText.includes('ships') ||
          (!availText.includes('unavailable') &&
           !availText.includes('out of stock') &&
           availText !== '');
      }

      // ── ASIN from URL or meta ──────────────────────────────────────────
      const asinFromUrl  = target.url.match(/\/dp\/([A-Z0-9]{10})/i)?.[1];
      const asinFromMeta = await page
        .$eval('input[name="ASIN"]', (el: HTMLInputElement) => el.value)
        .catch(() => null);
      const externalId = asinFromUrl ?? asinFromMeta ?? target.externalId;

      // ── Product name ───────────────────────────────────────────────────
      const nameEl      = await page.$('#productTitle');
      const productName = nameEl ? (await nameEl.innerText()).trim() : undefined;

      // ── Brand ─────────────────────────────────────────────────────────
      const brandEl = await page.$('#bylineInfo, .a-brand');
      const brand   = brandEl
        ? (await brandEl.innerText()).replace('Visit the', '').replace('Store', '').trim()
        : undefined;

      // ── Image URL ─────────────────────────────────────────────────────
      const imageUrl = await page
        .$eval('#landingImage, #imgTagWrapperId img', (el: HTMLImageElement) => el.src)
        .catch(() => undefined);

      // ── Original/List price (취소선 정가) ─────────────────────────────
      let originalPrice: number | undefined;
      const listPriceText = await page
        .$eval(
          '.basisPrice .a-price .a-offscreen, #listPrice, .a-price.a-text-strike .a-offscreen',
          (el: Element) => el.textContent?.trim() ?? '',
        )
        .catch(() => '');
      if (listPriceText) {
        const val = parseFloat(listPriceText.replace(/[^0-9.]/g, ''));
        if (!isNaN(val) && val > price) originalPrice = val;
      }

      // ── Currency detection ─────────────────────────────────────────────
      const currencySymbol = await page
        .$eval('.a-price-symbol', (el: Element) => el.textContent?.trim() ?? '$')
        .catch(() => '$');
      const currency = currencySymbol === '₩' ? 'KRW' : 'USD';

      // ── URL 정규화 — ASIN 기반 단축 URL 사용 ──────────────────────────
      const cleanedUrl = externalId
        ? `https://www.amazon.com/dp/${externalId}`
        : this.cleanProductUrl(target.url);

      return {
        externalId,
        url: cleanedUrl,
        price,
        originalPrice,
        currency,
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
    // Amazon discovery is rate-limited heavily — use search results page
    const searchMap: Record<string, string> = {
      gpu: 'https://www.amazon.com/s?k=graphics+card+gpu&rh=n%3A284822',
      cpu: 'https://www.amazon.com/s?k=desktop+processor+cpu&rh=n%3A229189',
      ram: 'https://www.amazon.com/s?k=desktop+ram+memory&rh=n%3A172282',
      ssd: 'https://www.amazon.com/s?k=internal+ssd&rh=n%3A1292115011',
    };

    const searchUrl = searchMap[categorySlug];
    if (!searchUrl) return [];

    const context = await this.createContext().catch((err) => {
      if (this.isChromiumUnavailable()) return null;
      throw err as Error;
    });
    if (!context) {
      this.logger.warn(`[Amazon] discoverProductUrls 건너뜀 — Chromium 미설치 환경`);
      return [];
    }
    const urls: string[] = [];

    try {
      const page = await this.openPage(context, searchUrl);

      if (this.isCaptchaPage(page)) {
        this.logger.warn('CAPTCHA on Amazon discovery — skipping');
        return [];
      }

      const links = await page.$$eval(
        'a.a-link-normal.s-underline-text',
        (anchors: HTMLAnchorElement[]) =>
          anchors
            .map((a) => a.href)
            .filter((href) => href.includes('/dp/'))
            .map((href) => {
              // ASIN만 추출해 트래킹 파라미터 없는 단축 URL 생성
              const asinMatch = href.match(/\/dp\/([A-Z0-9]{10})/i);
              return asinMatch
                ? `https://www.amazon.com/dp/${asinMatch[1]}`
                : href;
            }),
      );

      // Deduplicate
      urls.push(...new Set(links));
      this.logger.log(`Discovered ${urls.length} ASINs for "${categorySlug}" on Amazon`);
    } catch (err) {
      this.logger.error(`Amazon discovery failed: ${(err as Error).message}`);
    } finally {
      await context?.close();
    }

    return urls;
  }
}
