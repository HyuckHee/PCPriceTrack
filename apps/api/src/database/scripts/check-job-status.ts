import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://pcpriceUser:!asd123456@localhost:5432/pcpricetrack' });
  const db = drizzle(pool);

  console.log('\n=== 전체 crawl_jobs 상태 요약 ===');
  const summary = await db.execute(sql`
    SELECT s.name, cj.status, COUNT(*) as count
    FROM crawl_jobs cj
    JOIN stores s ON s.id = cj.store_id
    WHERE s.name IN ('쿠팡', '11번가', 'G마켓', '네이버쇼핑')
    GROUP BY s.name, cj.status
    ORDER BY s.name, cj.status
  `);
  console.table(summary.rows);

  console.log('\n=== 실패한 job 에러 메시지 (최근 10개) ===');
  const failed = await db.execute(sql`
    SELECT s.name, cj.status, cj.metadata->>'errorLog' as error, cj.created_at
    FROM crawl_jobs cj
    JOIN stores s ON s.id = cj.store_id
    WHERE s.name IN ('쿠팡', '11번가', 'G마켓', '네이버쇼핑')
      AND cj.status IN ('failed', 'dead', 'completed')
    ORDER BY cj.created_at DESC
    LIMIT 10
  `);
  console.table(failed.rows);

  console.log('\n=== 완료된 job discovery 결과 ===');
  const completed = await db.execute(sql`
    SELECT s.name, cj.status,
           cj.metadata->>'urlsAttempted' as urls_attempted,
           cj.metadata->>'urlsSucceeded' as urls_succeeded,
           cj.metadata->>'urlsFailed' as urls_failed,
           cj.metadata->>'note' as note,
           cj.created_at
    FROM crawl_jobs cj
    JOIN stores s ON s.id = cj.store_id
    WHERE s.name IN ('쿠팡', '11번가', 'G마켓', '네이버쇼핑')
      AND cj.status = 'completed'
    ORDER BY cj.created_at DESC
    LIMIT 15
  `);
  console.table(completed.rows);

  await pool.end();
}

main().catch(console.error);
