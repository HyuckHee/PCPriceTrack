import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1280, height: 900 },
  });
  await context.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  const page = await context.newPage();
  await page.goto('https://www.11st.co.kr/products/5067660331', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  console.log('Title:', await page.title());

  // Dump all price-related elements
  const priceEls = await page.$$eval('[class*="price"], [id*="price"], [class*="Price"], [id*="Price"]', (els: Element[]) =>
    els.slice(0, 20).map(el => ({
      tag: el.tagName,
      class: el.className?.slice(0, 60),
      id: (el as HTMLElement).id?.slice(0, 40),
      text: (el as HTMLElement).innerText?.replace(/\s+/g, ' ').trim().slice(0, 60),
    }))
  );
  console.log('\nPrice-related elements:');
  priceEls.forEach(e => console.log(`  [${e.tag}] class="${e.class}" id="${e.id}" → "${e.text}"`));

  // Try JSON-LD
  const ldScripts = await page.$$eval('script[type="application/ld+json"]', (scripts: HTMLScriptElement[]) =>
    scripts.map(s => s.innerText.slice(0, 300))
  );
  console.log('\nJSON-LD scripts:', ldScripts.length);
  ldScripts.forEach(s => console.log(' ', s));
}

main().catch(console.error);
