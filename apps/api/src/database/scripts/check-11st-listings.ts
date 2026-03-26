import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://pcpriceUser:!asd123456@localhost:5432/pcpricetrack' });
  const db = drizzle(pool);

  console.log('\n=== 11번가 리스팅 상세 ===');
  const listings = await db.execute(sql`
    SELECT pl.external_id, pl.is_active, pl.created_at,
           p.name as product_name, p.brand,
           pr.price, pr.currency, pr.in_stock
    FROM product_listings pl
    JOIN stores s ON s.id = pl.store_id
    JOIN products p ON p.id = pl.product_id
    LEFT JOIN price_records pr ON pr.listing_id = pl.id
    WHERE s.name = '11번가'
    ORDER BY pl.created_at DESC
    LIMIT 15
  `);
  console.table(listings.rows);

  console.log('\n=== discovery crawl_jobs 상세 (11번가) ===');
  const jobs = await db.execute(sql`
    SELECT cj.id, cj.status,
           cj.metadata->>'note' as note,
           cj.metadata->>'categorySlug' as category,
           cj.metadata->>'urlsAttempted' as urls_attempted,
           cj.metadata->>'urlsSucceeded' as urls_succeeded,
           cj.created_at, cj.updated_at
    FROM crawl_jobs cj
    JOIN stores s ON s.id = cj.store_id
    WHERE s.name = '11번가'
    ORDER BY cj.created_at DESC
    LIMIT 8
  `);
  console.table(jobs.rows);

  await pool.end();
}

main().catch(console.error);
