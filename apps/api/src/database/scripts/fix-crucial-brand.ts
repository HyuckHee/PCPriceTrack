import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

async function main() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://pcpriceUser:!asd123456@localhost:5432/pcpricetrack',
  });
  const db = drizzle(pool);

  // Fix Crucial products incorrectly tagged as AMD
  // (AMD rule matched "AMD Expo" in product name before Crucial rule ran)
  const res = await db.execute(sql`
    UPDATE products SET brand = 'Crucial'
    WHERE (name ILIKE '%크리티컬%' OR name ILIKE '%Crucial%')
      AND brand = 'AMD'
    RETURNING id, name, brand
  `);
  console.log(`Fixed ${res.rows.length} Crucial products:`);
  for (const r of res.rows as { id: string; name: string; brand: string }[]) {
    console.log(` - "${r.name.slice(0, 70)}" → ${r.brand}`);
  }

  // Similarly fix G.Skill products tagged wrong
  const res2 = await db.execute(sql`
    UPDATE products SET brand = 'G.Skill'
    WHERE (name ILIKE '%G.SKIL%' OR name ILIKE '%트라이던트%' OR name ILIKE '%Trident%')
      AND brand NOT IN ('G.Skill')
    RETURNING id, name, brand
  `);
  console.log(`Fixed ${res2.rows.length} G.Skill products:`);
  for (const r of res2.rows as { id: string; name: string; brand: string }[]) {
    console.log(` - "${r.name.slice(0, 70)}" → ${r.brand}`);
  }

  await pool.end();
}

main().catch(console.error);
