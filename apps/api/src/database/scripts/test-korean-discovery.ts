/**
 * 한국 쇼핑몰 어댑터 Discovery 직접 테스트
 * Playwright로 실제 URL을 찾아오는지 확인
 */
import { chromium } from 'playwright';

async function testUrl(name: string, url: string, selector: string) {
  console.log(`\n=== ${name} ===`);
  console.log(`URL: ${url}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9' },
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`Title: ${title.slice(0, 80)}`);

    // Check for CAPTCHA
    const pageText = await page.evaluate(() => document.body.innerText.slice(0, 200));
    if (pageText.includes('캡차') || pageText.includes('CAPTCHA') || pageText.includes('robot') || pageText.includes('blocked')) {
      console.log('⚠️  CAPTCHA/Block detected');
    }

    // Find links
    const links = await page.$$eval(selector, (anchors: HTMLAnchorElement[]) =>
      anchors.map((a) => a.href).filter(Boolean).slice(0, 5)
    ).catch(() => []);

    console.log(`Links found (${selector}): ${links.length}`);
    links.forEach(l => console.log(`  - ${l.slice(0, 100)}`));

    // Try alternative selectors if none found
    if (links.length === 0) {
      const allLinks = await page.$$eval('a[href]', (anchors: HTMLAnchorElement[]) =>
        anchors.map((a) => a.href).filter((h) => h.includes('product') || h.includes('item') || h.includes('goods')).slice(0, 5)
      ).catch(() => []);
      console.log(`Alternative links found: ${allLinks.length}`);
      allLinks.forEach(l => console.log(`  - ${l.slice(0, 100)}`));
    }
  } catch (e) {
    console.log(`Error: ${(e as Error).message.slice(0, 200)}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  // 쿠팡 GPU 카테고리
  await testUrl(
    '쿠팡',
    'https://www.coupang.com/np/categories/225174',
    'a.search-product-link, a[href*="/products/"]'
  );

  // 11번가 GPU 검색
  await testUrl(
    '11번가',
    'https://search.11st.co.kr/Search.tmall?kwd=그래픽카드+GPU&method=getSearchMain&searchType=TOTALPC',
    'a.c-card-item__link, a[href*="product"]'
  );

  // G마켓 GPU 검색
  await testUrl(
    'G마켓',
    'https://www.gmarket.co.kr/n/search?keyword=그래픽카드+GPU',
    'a.item__title, a[href*="gmarket.co.kr/n/item"], a[href*="item.gmarket.co.kr"]'
  );

  // 네이버쇼핑 GPU 검색
  await testUrl(
    '네이버쇼핑',
    'https://search.shopping.naver.com/search/all?query=그래픽카드+GPU&cat_id=50003631',
    'a[href*="shopping.naver.com/catalog"], a[href*="shopping.naver.com/product"]'
  );
}

main().catch(console.error);
