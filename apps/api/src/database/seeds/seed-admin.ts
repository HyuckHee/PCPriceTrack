import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import * as schema from '../schema';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

const ADMIN_EMAIL = 'admin';
const ADMIN_NAME = 'admin';
const ADMIN_PASSWORD = '@asd123456';

async function seedAdmin() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, ADMIN_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    // 이미 존재하면 role을 admin으로 업데이트
    await db
      .update(schema.users)
      .set({ role: 'admin', isVerified: true, updatedAt: new Date() })
      .where(eq(schema.users.email, ADMIN_EMAIL));
    console.log(`Admin user already exists. Role updated to admin.`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await db.insert(schema.users).values({
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash,
      role: 'admin',
      isVerified: true,
    });
    console.log(`Admin user created: ${ADMIN_EMAIL}`);
  }

  console.log('Done.');
  await pool.end();
}

seedAdmin().catch((err) => {
  console.error('seed-admin failed:', err);
  process.exit(1);
});
