import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9' },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const page = await context.newPage();
  await page.goto('https://search.11st.co.kr/Search.tmall?kwd=%EA%B7%B8%EB%9E%98%ED%94%BD%EC%B9%B4%EB%93%9C&method=getSearchMain&searchType=TOTALPC', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(6000);

  console.log('Title:', await page.title());

  // All 11st product links
  const all11stLinks = await page.$$eval('a[href*="11st.co.kr"]', (els: HTMLAnchorElement[]) =>
    [...new Set(els.map(a => a.href))].filter(h => !h.includes('adoffice') && !h.includes('javascript'))
  );

  console.log('\n11st.co.kr links (excluding adoffice):');
  all11stLinks.slice(0, 20).forEach(l => console.log(' ', l.slice(0, 120)));

  // prdNo pattern
  const prdLinks = all11stLinks.filter(h => /prdNo=\d+/.test(h));
  console.log(`\n prdNo= links: ${prdLinks.length}`);
  prdLinks.slice(0, 5).forEach(l => console.log(' ', l.slice(0, 120)));

  // /products/ pattern
  const prodLinks = all11stLinks.filter(h => /\/products\/\d+/.test(h));
  console.log(`\n /products/ links: ${prodLinks.length}`);
  prodLinks.slice(0, 5).forEach(l => console.log(' ', l.slice(0, 120)));

  await browser.close();
}

main().catch(console.error);
