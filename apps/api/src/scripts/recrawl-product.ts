/**
 * 특정 상품 가격을 즉시 재크롤링하는 스크립트
 * 사용법: tsx src/scripts/recrawl-product.ts [검색어]
 * 예시:   tsx src/scripts/recrawl-product.ts "5090"
 *         tsx src/scripts/recrawl-product.ts "E-2246G"
 */
import { config } from 'dotenv';
config({ path: '/Users/husker/PCPriceTrack/.env' });
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { ilike, and, eq } from 'drizzle-orm';
import { chromium } from 'playwright';
import { products } from '../database/schema/products';
import { productListings } from '../database/schema/product-listings';
import { priceRecords } from '../database/schema/price-records';
import { stores } from '../database/schema/stores';

const searchKeyword = process.argv[2];
if (!searchKeyword) {
  console.error('사용법: tsx src/scripts/recrawl-product.ts [검색어]');
  process.exit(1);
}

// URL에 %40 등 인코딩된 특수문자가 있을 경우 pg가 직접 파싱 못함 → 명시적 파라미터 사용
function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || '5432', 10),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
    ssl: u.hostname.includes('supabase.com') ? { rejectUnauthorized: false } : false,
  };
}

const pool = new Pool(parseDbUrl(process.env.DATABASE_URL!));
const db = drizzle(pool);

async function extractPrice(url: string): Promise<{ price: number; inStock: boolean } | null> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    let price: number | null = null;

    // ── Newegg ──────────────────────────────────────────────────────────────
    if (url.includes('newegg.com')) {
      const strongEl = await page.$('.price-current strong');
      if (strongEl) {
        const whole = (await strongEl.innerText()).replace(/[^0-9]/g, '');
        const supEl = await page.$('.price-current > sup');
        const spanEl = await page.$('.price-current > span');
        const sup = supEl ? (await supEl.innerText()).replace(/[^0-9]/g, '') : '00';
        const span = spanEl ? (await spanEl.innerText()).replace(/[^0-9.]/g, '') : '';
        const cents = span || sup;
        price = parseFloat(`${whole}.${cents.padStart(2, '0')}`);
      }
      if (!price) {
        const ldJson = await page.$('script[type="application/ld+json"]');
        if (ldJson) {
          const json = JSON.parse(await ldJson.innerText());
          price = parseFloat(json?.offers?.price ?? '0') || null;
        }
      }
      const addToCart = await page.$('button.btn-primary:has-text("Add to Cart")');
      const outOfStock = await page.$('.product-inventory:has-text("OUT OF STOCK")');
      return price ? { price, inStock: Boolean(addToCart) && !outOfStock } : null;
    }

    // ── 11번가 ──────────────────────────────────────────────────────────────
    if (url.includes('11st.co.kr')) {
      const priceEl = await page.$('#finalDscPrcArea dd.price, .c_prd_price dd.price');
      if (priceEl) {
        const text = (await priceEl.innerText()).replace(/[^0-9]/g, '');
        if (text) price = parseInt(text, 10);
      }
      const cartBtn = await page.$('#cartBtn, .btn_cart');
      const soldOut = await page.$('.soldout, .btn_soldout');
      return price ? { price, inStock: Boolean(cartBtn) && !soldOut } : null;
    }

    // ── Amazon ───────────────────────────────────────────────────────────────
    if (url.includes('amazon.com')) {
      const wholeEl = await page.$('.a-price-whole');
      const fracEl = await page.$('.a-price-fraction');
      if (wholeEl) {
        const whole = (await wholeEl.innerText()).replace(/[^0-9]/g, '');
        const frac = fracEl ? (await fracEl.innerText()).replace(/[^0-9]/g, '') : '00';
        price = parseFloat(`${whole}.${frac}`);
      }
      const addToCart = await page.$('#add-to-cart-button');
      return price ? { price, inStock: Boolean(addToCart) } : null;
    }

    return null;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log(`🔍 "${searchKeyword}" 검색 중...`);

  // 상품 + listings 조회
  const rows = await db
    .select({
      productId: products.id,
      productName: products.name,
      listingId: productListings.id,
      url: productListings.url,
      storeName: stores.name,
      currency: stores.name,
    })
    .from(products)
    .innerJoin(productListings, eq(productListings.productId, products.id))
    .innerJoin(stores, eq(stores.id, productListings.storeId))
    .where(
      and(
        ilike(products.name, `%${searchKeyword}%`),
        eq(productListings.isActive, true),
      ),
    )
    .limit(5);

  if (rows.length === 0) {
    console.log('❌ 해당 상품을 찾을 수 없습니다.');
    process.exit(0);
  }

  console.log(`✅ ${rows.length}개 listing 발견\n`);

  for (const row of rows) {
    console.log(`📦 ${row.productName}`);
    console.log(`   URL: ${row.url}`);
    console.log(`   스토어: ${row.storeName}`);

    try {
      const result = await extractPrice(row.url);
      if (!result) {
        console.log(`   ⚠️  가격 추출 실패\n`);
        continue;
      }

      const currency = row.url.includes('newegg.com') || row.url.includes('amazon.com') ? 'USD' : 'KRW';
      await db.insert(priceRecords).values({
        listingId: row.listingId,
        price: String(result.price),
        currency,
        inStock: result.inStock,
        recordedAt: new Date(),
      });

      console.log(`   💰 새 가격: ${result.price.toLocaleString()} ${currency}`);
      console.log(`   📦 재고: ${result.inStock ? '있음' : '없음'}`);
      console.log(`   ✅ DB 저장 완료\n`);
    } catch (err) {
      console.log(`   ❌ 오류: ${(err as Error).message}\n`);
    }
  }

  await pool.end();
  console.log('🏁 완료');
}

main().catch(console.error);
