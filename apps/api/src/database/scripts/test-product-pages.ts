import { chromium } from 'playwright';

async function testProductPage(name: string, url: string, priceSel: string) {
  console.log(`\n=== ${name} 상품 페이지 테스트 ===`);
  console.log(`URL: ${url.slice(0, 80)}`);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1280, height: 900 },
  });
  await context.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    const title = await page.title();
    console.log('Title:', title.slice(0, 80));
    const priceEl = await page.$(priceSel);
    if (priceEl) {
      const text = await priceEl.innerText();
      console.log(`Price (${priceSel}): "${text.replace(/\s+/g, ' ').trim().slice(0, 50)}"`);
    } else {
      console.log(`Price selector not found: ${priceSel}`);
      // Try JSON-LD
      const ldEl = await page.$('script[type="application/ld+json"]');
      if (ldEl) {
        const ldText = await ldEl.innerText();
        console.log('JSON-LD found:', ldText.slice(0, 200));
      }
    }
  } catch (e) {
    console.log('Error:', (e as Error).message.slice(0, 200));
  } finally {
    await browser.close();
  }
}

async function main() {
  // 11번가 - product from discovery
  await testProductPage(
    '11번가',
    'https://www.11st.co.kr/products/5067660331',
    '#buyPrice, .price_area .sale em'
  );

  // 쿠팡 - sample GPU product
  await testProductPage(
    '쿠팡',
    'https://www.coupang.com/vp/products/7878076756',
    '.prod-buy-price .price-value, .total-price strong'
  );
}

main().catch(console.error);
