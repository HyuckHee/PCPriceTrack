/**
 * 11번가 Discovery job을 Bull 큐에 직접 추가
 */
import Bull from 'bull';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { stores, crawlJobs } from '../schema';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://pcpriceUser:!asd123456@localhost:5432/pcpricetrack' });
  const db = drizzle(pool);

  // 11번가 store 찾기
  const [store] = await db.select().from(stores).where(eq(stores.name, '11번가'));
  if (!store) {
    console.error('11번가 store not found');
    await pool.end();
    return;
  }
  console.log(`Found store: ${store.name} (${store.id})`);

  const queue = new Bull('crawl', {
    redis: { host: '127.0.0.1', port: 6379 },
  });

  const categories = ['gpu', 'cpu', 'ram', 'ssd'];

  for (const categorySlug of categories) {
    // DB에 crawl_job 레코드 생성
    const [dbJob] = await db.insert(crawlJobs).values({
      storeId: store.id,
      status: 'pending',
      metadata: { triggeredBy: 'manual', categorySlug, note: `11st-discovery-fix` },
    }).returning({ id: crawlJobs.id });

    const payload = {
      crawlJobId: dbJob.id,
      storeId: store.id,
      type: 'discovery',
      categorySlug,
      triggeredBy: 'manual',
    };

    const bullJob = await queue.add('discovery', payload, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 30000 },
      removeOnComplete: 20,
      removeOnFail: 50,
      priority: 1, // 높은 우선순위 (낮은 숫자 = 높은 우선순위)
    });

    console.log(`Enqueued 11번가 ${categorySlug} discovery | dbJobId=${dbJob.id} | bullJobId=${bullJob.id}`);
  }

  await queue.close();
  await pool.end();
  console.log('Done! 4 discovery jobs enqueued for 11번가');
}

main().catch(console.error);
