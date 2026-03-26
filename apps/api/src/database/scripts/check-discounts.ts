/**
 * 할인율 99.9% 원인 점검
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  // 1. 할인율 계산 방식 확인 - lowest_price vs current_price
  console.log('\n=== 할인율 99% 이상 상품 ===');
  const badDiscounts = await db.execute(sql`
    SELECT
      p.name,
      p.currency,
      p.current_price,
      p.lowest_price,
      p.highest_price,
      CASE WHEN p.lowest_price > 0 THEN
        ROUND(((p.current_price - p.lowest_price) / p.lowest_price * 100)::numeric, 1)
      ELSE NULL END as discount_pct,
      (SELECT COUNT(*) FROM price_records pr WHERE pr.product_id = p.id) as record_count,
      (SELECT MIN(pr.price) FROM price_records pr WHERE pr.product_id = p.id) as min_record_price,
      (SELECT MAX(pr.price) FROM price_records pr WHERE pr.product_id = p.id) as max_record_price
    FROM products p
    WHERE p.lowest_price > 0 AND p.current_price > 0
      AND ABS((p.current_price - p.lowest_price) / p.lowest_price) > 0.5
    ORDER BY ABS((p.current_price - p.lowest_price) / p.lowest_price) DESC
    LIMIT 20
  `);

  for (const r of badDiscounts.rows as any[]) {
    console.log({
      name: r.name?.slice(0, 50),
      currency: r.currency,
      current_price: Number(r.current_price),
      lowest_price: Number(r.lowest_price),
      discount_pct: `${r.discount_pct}%`,
      record_count: r.record_count,
      min_in_db: Number(r.min_record_price),
      max_in_db: Number(r.max_record_price),
    });
  }

  // 2. 전체 할인율 분포
  console.log('\n=== 할인율 분포 ===');
  const dist = await db.execute(sql`
    SELECT
      CASE
        WHEN (p.current_price - p.lowest_price) / p.lowest_price < -0.5 THEN '50%이상 할인 (비정상)'
        WHEN (p.current_price - p.lowest_price) / p.lowest_price < -0.2 THEN '20~50% 할인'
        WHEN (p.current_price - p.lowest_price) / p.lowest_price < 0   THEN '0~20% 할인'
        WHEN (p.current_price - p.lowest_price) / p.lowest_price = 0   THEN '할인없음 (최저가 = 현재가)'
        ELSE '현재가 > 최저가 (데이터 오류)'
      END as bucket,
      COUNT(*) as count
    FROM products p
    WHERE p.lowest_price > 0 AND p.current_price > 0
    GROUP BY 1
    ORDER BY 2 DESC
  `);
  console.table(dist.rows);

  // 3. lowest_price가 current_price보다 비정상적으로 낮은 경우 - 통화 혼재 가능성
  console.log('\n=== lowest_price가 current_price의 1% 미만인 상품 (통화 혼재 의심) ===');
  const mixed = await db.execute(sql`
    SELECT
      p.name,
      p.currency,
      p.current_price,
      p.lowest_price,
      s.name as store_name
    FROM products p
    JOIN product_listings pl ON pl.product_id = p.id
    JOIN stores s ON s.id = pl.store_id
    WHERE p.lowest_price > 0
      AND p.lowest_price < p.current_price * 0.01
    GROUP BY p.id, p.name, p.currency, p.current_price, p.lowest_price, s.name
    LIMIT 10
  `);
  for (const r of mixed.rows as any[]) {
    console.log({
      name: r.name?.slice(0, 50),
      store: r.store_name,
      currency: r.currency,
      current: Number(r.current_price),
      lowest: Number(r.lowest_price),
    });
  }
}

main().finally(() => pool.end());
