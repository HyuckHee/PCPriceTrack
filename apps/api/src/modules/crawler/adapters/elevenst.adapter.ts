import { BrowserContext } from 'playwright';
import { AbortError, BaseSiteAdapter } from './base.adapter';
import { ListingTarget, ScrapeResult } from '../interfaces/adapter.interface';

/**
 * 11번가 어댑터.
 *
 * 가격 선택자:
 *   1. .price_area #buyPrice          (구매가)
 *   2. .sale_price .value             (할인가)
 *   3. JSON-LD                        (fallback)
 *
 * 외부 ID: URL의 prdNo 파라미터 또는 /product/(\d+)
 * 통화: KRW
 */
export class ElevenStAdapter extends BaseSiteAdapter {
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
      if (!title || title.includes('오류')) {
        throw new AbortError(`Error page at ${target.url}`);
      }

      // ── 가격 추출 ────────────────────────────────────────────────────
      let price: number | null = null;

      // Strategy 1: 구매 최종가 (dd.price — confirmed from live DOM)
      const buyPriceEl = await page.$('#finalDscPrcArea dd.price, .price_block dd.price, .c_prd_price dd.price');
      if (buyPriceEl) {
        const text = (await buyPriceEl.innerText()).replace(/[^0-9]/g, '');
        if (text) price = parseInt(text, 10);
      }

      // Strategy 2: 판매가 영역
      if (!price) {
        const salePriceEl = await page.$('.price_info dd.price, dd.price');
        if (salePriceEl) {
          const text = (await salePriceEl.innerText()).replace(/[^0-9]/g, '');
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
      const cartBtn = await page.$('#cartBtn, .btn_cart, button[data-log-actionid-label="cart"]');
      const soldOut = await page.$('.soldout, .btn_soldout, .end_sale');
      const inStock = Boolean(cartBtn) && !soldOut;

      // ── 외부 ID ──────────────────────────────────────────────────────
      const prdNoMatch =
        target.url.match(/[?&]prdNo=(\d+)/) ??
        target.url.match(/\/products\/(\d+)/);  // 11st uses /products/ (plural)
      const externalId = prdNoMatch?.[1] ?? target.externalId;

      // ── 상품명 ───────────────────────────────────────────────────────
      // 1순위: 상품명 전용 span/em 셀렉터 (팝업 컨테이너 제외)
      // 2순위: .c_product_info_title 직계 텍스트 노드만 추출
      // 3순위: innerText에서 UI 잡음 제거
      // UI 잡음이 시작되는 첫 지점에서 잘라냄 (replace보다 안전)
      const UI_NOISE_BOUNDARY =
        /찜하기|공유하기|찜 완료|찜해제 완료|찜이 되었습니다|찜이 취소 되었습니다|찜한상품 전체보기|페이스북|카카오스토리|닫기|복사/;

      const productName = await page
        .$eval(
          '.c_product_info_title span:not(.c_product_share):not(.c_product_wish), #product_title, h1.title, .product_title',
          (el: Element) => {
            const textNodes = Array.from(el.childNodes)
              .filter((n) => n.nodeType === 3)
              .map((n) => n.textContent?.trim() ?? '')
              .filter(Boolean);
            return textNodes.length > 0
              ? textNodes.join(' ').trim()
              : (el as HTMLElement).innerText.trim();
          },
        )
        .catch(() =>
          page.$eval(
            '.c_product_info_title, #product_title, h1.title, .product_title',
            (el: Element) => {
              const textNodes = Array.from(el.childNodes)
                .filter((n) => n.nodeType === 3)
                .map((n) => n.textContent?.trim() ?? '')
                .filter(Boolean);
              return textNodes.length > 0
                ? textNodes.join(' ').trim()
                : (el as HTMLElement).innerText.trim();
            },
          ).catch(() => undefined),
        )
        .then((name) => {
          if (!name) return undefined;
          // 첫 번째 UI 잡음 키워드 이전 텍스트만 사용
          const cleaned = name.split(UI_NOISE_BOUNDARY)[0].replace(/\s+/g, ' ').trim();
          return cleaned || undefined;
        });

      // ── 브랜드 ───────────────────────────────────────────────────────
      // 1순위: 상품명에서 [브랜드] 패턴 추출 (예: "[이엠텍]지포스 RTX 3050")
      // 2순위: 판매자명 (h4.c_product_seller_title)
      let brand: string | undefined;
      if (productName) {
        const bracketMatch = productName.match(/^\[([^\]]+)\]/);
        if (bracketMatch) brand = bracketMatch[1];
      }
      if (!brand) {
        brand = await page
          .$eval('h4.c_product_seller_title, .seller_name a, .brand_name', (el: Element) =>
            (el as HTMLElement).innerText?.trim(),
          )
          .catch(() => undefined);
      }

      // ── 이미지 ───────────────────────────────────────────────────────
      // 11번가 CDN: cdn.011st.com/11dims/resize/600x600/.../product/ID/B.webp
      const imageUrl = await page
        .$eval(
          'img[src*="cdn.011st.com/11dims"][src*="600x600"], img[src*="cdn.011st.com/11dims"][src*="11src/product"]',
          (el: HTMLImageElement) => el.src,
        )
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
    // 11번가 PC부품 카테고리 검색
    const searchMap: Record<string, string> = {
      gpu: 'https://search.11st.co.kr/Search.tmall?kwd=그래픽카드+GPU&method=getSearchMain&searchType=TOTALPC',
      cpu: 'https://search.11st.co.kr/Search.tmall?kwd=CPU+프로세서&method=getSearchMain&searchType=TOTALPC',
      ram: 'https://search.11st.co.kr/Search.tmall?kwd=RAM+메모리+DDR5&method=getSearchMain&searchType=TOTALPC',
      ssd: 'https://search.11st.co.kr/Search.tmall?kwd=SSD+NVMe+내장&method=getSearchMain&searchType=TOTALPC',
      motherboard: 'https://search.11st.co.kr/Search.tmall?kwd=메인보드+마더보드&method=getSearchMain&searchType=TOTALPC',
    };

    const searchUrl = searchMap[categorySlug];
    if (!searchUrl) return [];

    const context = await this.createContext();
    const urls: string[] = [];

    try {
      const page = await this.openPage(context, searchUrl);

      if (this.isCaptchaPage(page)) {
        this.logger.warn(`11번가 Discovery CAPTCHA`);
        return [];
      }

      // JS 렌더링 대기 (상품 목록이 동적으로 로드됨)
      await page.waitForTimeout(6000);

      const links = await page.$$eval(
        'a[href*="11st.co.kr/products/"]',
        (anchors: HTMLAnchorElement[]) =>
          anchors
            .map((a) => a.href.split('?')[0])          // 트래킹 파라미터 제거
            .filter((href) => /\/products\/\d+/.test(href)), // 실제 상품 URL만
      );

      urls.push(...new Set(links));
      this.logger.log(`11번가: ${urls.length}개 URL 발견 (${categorySlug})`);
    } catch (err) {
      this.logger.error(`11번가 Discovery 실패: ${(err as Error).message}`);
    } finally {
      await context.close();
    }

    return urls;
  }
}
