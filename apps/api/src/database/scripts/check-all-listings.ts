import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://pcpriceUser:!asd123456@localhost:5432/pcpricetrack' });
  const db = drizzle(pool);

  console.log('\n=== 모든 스토어 리스팅 현황 ===');
  const stats = await db.execute(sql`
    SELECT s.name as store, COUNT(pl.id) as listings, COUNT(DISTINCT pl.product_id) as products,
           MAX(pr.recorded_at) as last_price
    FROM stores s
    LEFT JOIN product_listings pl ON pl.store_id = s.id
    LEFT JOIN price_records pr ON pr.listing_id = pl.id
    GROUP BY s.name
    ORDER BY listings DESC
  `);
  console.table(stats.rows);

  console.log('\n=== 11번가 리스팅 (최근 생성순) ===');
  const listings = await db.execute(sql`
    SELECT pl.external_id, pl.url, pl.is_active, pl.consecutive_failures, pl.created_at,
           p.name as product_name, pr.price, pr.currency
    FROM product_listings pl
    JOIN stores s ON s.id = pl.store_id
    JOIN products p ON p.id = pl.product_id
    LEFT JOIN price_records pr ON pr.listing_id = pl.id
    WHERE s.name = '11번가'
    ORDER BY pl.created_at DESC
    LIMIT 10
  `);
  console.table(listings.rows);

  console.log('\n=== 최신 discovery crawl_jobs (11번가) ===');
  const jobs = await db.execute(sql`
    SELECT cj.id, cj.status, cj.metadata, cj.created_at, cj.updated_at
    FROM crawl_jobs cj
    JOIN stores s ON s.id = cj.store_id
    WHERE s.name = '11번가'
      AND cj.metadata->>'note' LIKE '%discovery%'
    ORDER BY cj.created_at DESC
    LIMIT 5
  `);
  console.table(jobs.rows);

  await pool.end();
}

main().catch(console.error);
