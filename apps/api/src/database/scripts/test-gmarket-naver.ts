import { chromium } from 'playwright';

async function testGmarket() {
  console.log('\n=== G마켓 (더 긴 대기 + 다른 URL) ===');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1280, height: 900 },
  });
  await context.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  const page = await context.newPage();

  try {
    // Try old search.gmarket.co.kr (redirects to n/search)
    await page.goto('https://www.gmarket.co.kr/n/search?keyword=%EA%B7%B8%EB%9E%98%ED%94%BD%EC%B9%B4%EB%93%9C', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(8000);

    const title = await page.title();
    const url = page.url();
    console.log('Title:', title.slice(0, 80));
    console.log('Final URL:', url.slice(0, 100));

    // Check for common product link patterns
    for (const sel of [
      'a[href*="item.gmarket.co.kr"]',
      'a[href*="gmarket.co.kr/n/item"]',
      'a[href*="goodscode"]',
      '.item__title a',
      '.list-item a.itemtitle',
    ]) {
      const links = await page.$$eval(sel, (els: HTMLAnchorElement[]) => els.map(a => a.href).filter(Boolean)).catch(() => [] as string[]);
      if (links.length > 0) console.log(`  ${sel}: ${links.length} links → ${links[0].slice(0, 100)}`);
    }

    const allLinks = await page.$$eval('a[href]', (els: HTMLAnchorElement[]) =>
      [...new Set(els.map(a => a.href))].filter(h => h.includes('gmarket') || h.includes('auction')).slice(0, 10)
    ).catch(() => [] as string[]);
    console.log('All gmarket/auction links:', allLinks.length);
    allLinks.forEach(l => console.log(' ', l.slice(0, 120)));
  } catch (e) {
    console.log('Error:', (e as Error).message.slice(0, 200));
  } finally {
    await browser.close();
  }
}

async function testNaver() {
  console.log('\n=== 네이버쇼핑 (load + 10s wait) ===');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1280, height: 900 },
  });
  await context.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  const page = await context.newPage();

  try {
    await page.goto('https://search.shopping.naver.com/search/all?query=%EA%B7%B8%EB%9E%98%ED%94%BD%EC%B9%B4%EB%93%9C', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(10000);

    const title = await page.title();
    console.log('Title:', title.slice(0, 80));

    for (const sel of [
      'a[href*="shopping.naver.com/catalog"]',
      'a[href*="shopping.naver.com/product"]',
      'a[href*="nvMid"]',
      '.adProduct_item__link__TN_nU',
      '[class*="product_item"] a',
      '[class*="basicList"] a',
      '[class*="item"] a[href*="naver"]',
    ]) {
      const links = await page.$$eval(sel, (els: HTMLAnchorElement[]) => els.map(a => a.href).filter(Boolean)).catch(() => [] as string[]);
      if (links.length > 0) console.log(`  ${sel}: ${links.length} → ${links[0].slice(0, 100)}`);
    }

    const allLinks = await page.$$eval('a[href]', (els: HTMLAnchorElement[]) =>
      [...new Set(els.map(a => a.href))].filter(h => h.includes('naver') && !h.includes('help') && !h.includes('pay')).slice(0, 8)
    ).catch(() => [] as string[]);
    console.log('All naver links:', allLinks.length);
    allLinks.forEach(l => console.log(' ', l.slice(0, 120)));
  } catch (e) {
    console.log('Error:', (e as Error).message.slice(0, 200));
  } finally {
    await browser.close();
  }
}

testGmarket().then(testNaver).catch(console.error);
