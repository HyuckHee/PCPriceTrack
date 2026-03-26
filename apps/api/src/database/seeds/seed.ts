import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as schema from '../schema';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

const STORES = [
  {
    name: 'Newegg',
    baseUrl: 'https://www.newegg.com',
    logoUrl: 'https://c1.neweggimages.com/WebResource/Themes/Nest/logos/logo_424x210.png',
  },
  {
    name: 'Amazon',
    baseUrl: 'https://www.amazon.com',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
  },
  {
    name: 'B&H Photo',
    baseUrl: 'https://www.bhphotovideo.com',
    logoUrl: 'https://www.bhphotovideo.com/images/bh_logo.svg',
  },
  {
    name: 'Micro Center',
    baseUrl: 'https://www.microcenter.com',
    logoUrl: null,
  },
  {
    name: 'Best Buy',
    baseUrl: 'https://www.bestbuy.com',
    logoUrl: null,
  },
  {
    name: '쿠팡',
    baseUrl: 'https://www.coupang.com',
    logoUrl: 'https://img1a.flgoo.co.kr/images/M00/07/BE/rBIAAFhe5jCAA4ksAABs5socdoA948.png',
  },
  {
    name: '11번가',
    baseUrl: 'https://www.11st.co.kr',
    logoUrl: null,
  },
  {
    name: 'G마켓',
    baseUrl: 'https://www.gmarket.co.kr',
    logoUrl: null,
  },
  {
    name: '네이버쇼핑',
    baseUrl: 'https://shopping.naver.com',
    logoUrl: null,
  },
];

const CATEGORIES = [
  { name: 'CPU', slug: 'cpu', description: 'Processors' },
  { name: 'GPU', slug: 'gpu', description: 'Graphics Cards' },
  { name: 'RAM', slug: 'ram', description: 'Memory' },
  { name: 'SSD', slug: 'ssd', description: 'Solid State Drives' },
  { name: 'HDD', slug: 'hdd', description: 'Hard Disk Drives' },
  { name: 'Motherboard', slug: 'motherboard', description: 'Motherboards' },
  { name: 'PSU', slug: 'psu', description: 'Power Supply Units' },
  { name: 'Case', slug: 'case', description: 'PC Cases' },
  { name: 'Cooler', slug: 'cooler', description: 'CPU Coolers' },
  { name: 'Monitor', slug: 'monitor', description: 'Monitors' },
];

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Seeding categories...');
  await db
    .insert(schema.categories)
    .values(CATEGORIES)
    .onConflictDoNothing({ target: schema.categories.slug });

  console.log('Seeding stores...');
  await db
    .insert(schema.stores)
    .values(STORES)
    .onConflictDoNothing();

  console.log('Seed complete.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
