import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://pcpriceUser:!asd123456@localhost:5432/pcpricetrack' });
  const db = drizzle(pool);

  console.log('\n=== Korean Store Stats ===');
  const stats = await db.execute(sql`
    SELECT s.name as store_name, COUNT(pl.id) as listing_count, COUNT(DISTINCT pl.product_id) as product_count,
           MAX(pr.recorded_at) as last_crawled
    FROM stores s
    LEFT JOIN product_listings pl ON pl.store_id = s.id AND pl.is_active = true
    LEFT JOIN price_records pr ON pr.listing_id = pl.id
    WHERE s.name IN ('쿠팡', '11번가', 'G마켓', '네이버쇼핑')
    GROUP BY s.name
    ORDER BY s.name
  `);
  console.table(stats.rows);

  console.log('\n=== Recent crawl jobs for Korean stores ===');
  const jobs = await db.execute(sql`
    SELECT s.name as store_name, cj.status, cj.created_at, cj.metadata
    FROM crawl_jobs cj
    JOIN stores s ON s.id = cj.store_id
    WHERE s.name IN ('쿠팡', '11번가', 'G마켓', '네이버쇼핑')
    ORDER BY cj.created_at DESC
    LIMIT 20
  `);
  console.table(jobs.rows);

  console.log('\n=== Sample listings from Korean stores ===');
  const listings = await db.execute(sql`
    SELECT s.name as store, pl.external_id, pl.url, pl.is_active,
           p.name as product_name, pr.price, pr.currency
    FROM product_listings pl
    JOIN stores s ON s.id = pl.store_id
    JOIN products p ON p.id = pl.product_id
    LEFT JOIN price_records pr ON pr.listing_id = pl.id
    WHERE s.name IN ('쿠팡', '11번가', 'G마켓', '네이버쇼핑')
    ORDER BY pr.recorded_at DESC NULLS LAST
    LIMIT 15
  `);
  console.table(listings.rows);

  await pool.end();
}

main().catch(console.error);
