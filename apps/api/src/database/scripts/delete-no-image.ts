import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { isNull } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as schema from '../schema';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  const countResult = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE image_url IS NULL) as no_image,
      COUNT(*) FILTER (WHERE image_url IS NOT NULL) as has_image
    FROM products
  `);
  console.log('=== 삭제 전 현황 ===');
  console.table(countResult.rows);

  // image_url이 없는 product의 id 목록 조회
  const noImageProducts = await pool.query(`
    SELECT id, name FROM products WHERE image_url IS NULL
  `);
  console.log(`\n이미지 없는 제품 수: ${noImageProducts.rows.length}개`);

  if (noImageProducts.rows.length === 0) {
    console.log('삭제할 데이터 없음.');
    await pool.end();
    return;
  }

  // 연관 데이터 cascade 삭제 (price_records → product_listings → products)
  const ids = noImageProducts.rows.map((r: { id: string }) => r.id);
  const placeholders = ids.map((_: string, i: number) => `$${i + 1}`).join(', ');

  // price_records 삭제 (product_listings를 통해)
  await pool.query(`
    DELETE FROM price_records
    WHERE listing_id IN (
      SELECT id FROM product_listings WHERE product_id IN (${placeholders})
    )
  `, ids);
  console.log('price_records 삭제 완료');

  // product_listings 삭제
  await pool.query(`
    DELETE FROM product_listings WHERE product_id IN (${placeholders})
  `, ids);
  console.log('product_listings 삭제 완료');

  // products 삭제
  const deleteResult = await pool.query(`
    DELETE FROM products WHERE image_url IS NULL RETURNING id, name
  `);
  console.log(`\nproducts ${deleteResult.rowCount}개 삭제 완료`);

  // 삭제 후 현황
  const afterCount = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE image_url IS NULL) as no_image,
      COUNT(*) FILTER (WHERE image_url IS NOT NULL) as has_image
    FROM products
  `);
  console.log('\n=== 삭제 후 현황 ===');
  console.table(afterCount.rows);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
