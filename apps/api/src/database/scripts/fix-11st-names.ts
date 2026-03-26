/**
 * 11번가 상품명에서 "찜하기/공유하기" 팝업 잔재 텍스트를 제거
 *
 * 패턴: 상품명 뒤에 줄바꿈 + "찜 완료", "찜이 되었습니다", "페이스북", "복사" 등
 * 실제 상품명 이후에 오는 모든 텍스트를 제거합니다.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

function cleanProductName(name: string): string {
  // "찜 완료", "찜하기", "공유하기" 등 UI 팝업 텍스트가 시작되는 지점부터 제거
  // 이 문자들은 항상 줄바꿈(\n) 뒤에 옵니다
  const cutPatterns = [
    /\n+찜\s/,
    /\n+찜하기/,
    /\n+공유하기/,
    /\s+찜\s+완료/,
  ];

  let cleaned = name;
  for (const pattern of cutPatterns) {
    const match = cleaned.search(pattern);
    if (match !== -1) {
      cleaned = cleaned.slice(0, match).trim();
      break;
    }
  }

  return cleaned;
}

async function main() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://pcpriceUser:!asd123456@localhost:5432/pcpricetrack',
  });
  const db = drizzle(pool);

  // 11번가 연결된 상품 중 줄바꿈 문자를 포함하는 것들 (= 오염된 이름)
  const listings = await db.execute(sql`
    SELECT p.id, p.name
    FROM products p
    JOIN product_listings pl ON pl.product_id = p.id
    JOIN stores s ON s.id = pl.store_id
    WHERE s.name = '11번가'
      AND p.name LIKE E'%\n%'
    GROUP BY p.id, p.name
  `);

  console.log(`\n총 ${listings.rows.length}개 오염된 상품명 처리 중...\n`);

  let updated = 0;
  let unchanged = 0;

  for (const row of listings.rows as { id: string; name: string }[]) {
    const cleaned = cleanProductName(row.name);
    if (cleaned !== row.name) {
      await db.execute(sql`UPDATE products SET name = ${cleaned} WHERE id = ${row.id}`);
      console.log(`✓ "${cleaned.slice(0, 70)}"`);
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log(`\n${updated}개 업데이트, ${unchanged}개 변경 없음`);
  await pool.end();
}

main().catch(console.error);
