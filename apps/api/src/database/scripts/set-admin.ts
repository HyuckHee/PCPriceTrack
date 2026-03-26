import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { users } from '../schema/users';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://pcpriceUser:!asd123456@localhost:5432/pcpricetrack' });
  const db = drizzle(pool);
  const result = await db.update(users).set({ role: 'admin' }).where(eq(users.email, 'admin@pcpricetrack.dev')).returning();
  console.log('Updated:', result);
  await pool.end();
}

main().catch(console.error);
