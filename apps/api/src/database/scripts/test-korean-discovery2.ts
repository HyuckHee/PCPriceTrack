/**
 * 수정된 셀렉터로 재테스트
 */
import { chromium } from 'playwright';

async function testSite(name: string, url: string, waitSel: string | null, linkSel: string, extraWait = 4000) {
  console.log(`\n=== ${name} ===`);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7' },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const page = await context.newPage();
  try {
    await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
    if (waitSel) {
      await page.waitForSelector(waitSel, { timeout: 10000 }).catch(() => {});
    } else {
      await page.waitForTimeout(extraWait);
    }

    const title = await page.title();
    console.log(`Title: ${title.slice(0, 80)}`);

    const links = await page.$$eval(linkSel, (anchors: HTMLAnchorElement[]) =>
      anchors.map((a) => a.href).filter(Boolean)
    ).catch(() => [] as string[]);

    const productLinks = links.filter((h: string) =>
      /prdNo=\d+|\/products\/\d+|goodscode=\d+|\d{7,}|nvMid=\d+|\/catalog\/\d+/.test(h)
    ).slice(0, 5);

    console.log(`Links matching product pattern: ${productLinks.length} (total: ${links.length})`);
    productLinks.forEach((l: string) => console.log(`  ✓ ${l.slice(0, 120)}`));

    if (productLinks.length === 0 && links.length > 0) {
      console.log('Sample links found (no product pattern match):');
      links.slice(0, 3).forEach((l: string) => console.log(`  - ${l.slice(0, 120)}`));
    }

    if (links.length === 0) {
      // Dump all <a> href patterns for debugging
      const allHrefs = await page.$$eval('a[href]', (els: HTMLAnchorElement[]) => {
        const hrefs = els.map(a => a.href).filter(h => h && !h.startsWith('javascript'));
        return [...new Set(hrefs)].slice(0, 10);
      }).catch(() => [] as string[]);
      console.log('All hrefs found (debug):');
      allHrefs.forEach((h: string) => console.log(`  ? ${h.slice(0, 120)}`));
    }
  } catch (e) {
    console.log(`Error: ${(e as Error).message.slice(0, 200)}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  // 쿠팡 - search URL 시도
  await testSite(
    '쿠팡 (search)',
    'https://www.coupang.com/np/search?q=%EA%B7%B8%EB%9E%98%ED%94%BD%EC%B9%B4%EB%93%9C&channel=user',
    null,
    'a[href*="/products/"]',
    5000
  );

  // 11번가 - 실제 상품 링크 패턴
  await testSite(
    '11번가 (prdNo)',
    'https://search.11st.co.kr/Search.tmall?kwd=%EA%B7%B8%EB%9E%98%ED%94%BD%EC%B9%B4%EB%93%9C&method=getSearchMain&searchType=TOTALPC',
    null,
    'a[href*="11st.co.kr"]',
    5000
  );

  // G마켓 - 다른 접근
  await testSite(
    'G마켓',
    'https://www.gmarket.co.kr/n/search?keyword=%EA%B7%B8%EB%9E%98%ED%94%BD%EC%B9%B4%EB%93%9C',
    null,
    'a[href*="gmarket.co.kr"], a[href*="auction.co.kr"]',
    8000
  );

  // 네이버쇼핑 - networkidle 사용
  await testSite(
    '네이버쇼핑 (networkidle)',
    'https://search.shopping.naver.com/search/all?query=%EA%B7%B8%EB%9E%98%ED%94%BD%EC%B9%B4%EB%93%9C',
    null,
    'a[href*="shopping.naver.com"]',
    8000
  );
}

main().catch(console.error);
