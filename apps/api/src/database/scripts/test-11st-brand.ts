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
  // RTX 3050 product
  await page.goto('https://www.11st.co.kr/products/7645336677', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  console.log('Title:', await page.title());

  // Dump brand/seller related elements
  const brandEls = await page.$$eval(
    '[class*="brand"], [class*="seller"], [class*="maker"], [class*="Brand"], [class*="Seller"], [id*="brand"], [id*="seller"]',
    (els: Element[]) => els.slice(0, 15).map(el => ({
      tag: el.tagName,
      class: el.className?.slice(0, 60),
      id: (el as HTMLElement).id?.slice(0, 30),
      text: (el as HTMLElement).innerText?.replace(/\s+/g, ' ').trim().slice(0, 80),
    }))
  );
  console.log('\nBrand/Seller elements:');
  brandEls.forEach(e => console.log(`  [${e.tag}] .${e.class} #${e.id} → "${e.text}"`));

  // Check title/heading for product name
  const titleEls = await page.$$eval(
    'h1, h2, [class*="title"], [class*="name"], [id*="title"], [id*="name"]',
    (els: Element[]) => els.slice(0, 10).map(el => ({
      tag: el.tagName,
      class: el.className?.slice(0, 50),
      id: (el as HTMLElement).id?.slice(0, 30),
      text: (el as HTMLElement).innerText?.replace(/\s+/g, ' ').trim().slice(0, 100),
    }))
  );
  console.log('\nTitle/Name elements:');
  titleEls.forEach(e => console.log(`  [${e.tag}] .${e.class} #${e.id} → "${e.text}"`));

  // Check image
  const imgEls = await page.$$eval(
    '#mainImg img, .product_img img, [class*="product"] img, [class*="item"] img',
    (els: HTMLImageElement[]) => els.slice(0, 5).map(el => ({ src: el.src?.slice(0, 120), alt: el.alt }))
  );
  console.log('\nImages:');
  imgEls.forEach(e => console.log(`  src="${e.src}" alt="${e.alt}"`));

  await browser.close();
}

main().catch(console.error);
