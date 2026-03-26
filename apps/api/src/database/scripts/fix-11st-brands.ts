/**
 * 기존 11번가 상품들의 brand를 상품명에서 추출해 업데이트
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

// 상품명에서 브랜드를 감지하는 규칙 (순서 중요 - 더 구체적인 것 먼저)
const BRAND_RULES: { pattern: RegExp; brand: string }[] = [
  // [브랜드] 패턴
  { pattern: /^\[([^\]]{1,30})\]/, brand: '$1' },

  // 한국 브랜드
  { pattern: /이엠텍/i, brand: '이엠텍' },
  { pattern: /삼성전자|삼성\s/i, brand: 'Samsung' },
  { pattern: /SK\s*하이닉스|SK\s*hynix/i, brand: 'SK Hynix' },
  { pattern: /타무즈/i, brand: 'Tammuz' },

  // GPU 브랜드
  { pattern: /\bINNO3D\b/i, brand: 'INNO3D' },
  { pattern: /조텍|ZOTAC/i, brand: 'ZOTAC' },
  { pattern: /에이수스|ASUS\b/i, brand: 'ASUS' },
  { pattern: /기가바이트|GIGABYTE/i, brand: 'Gigabyte' },
  { pattern: /\bMSI\b/i, brand: 'MSI' },
  { pattern: /NVIDIA\b/i, brand: 'NVIDIA' },
  { pattern: /\bAMD\b/i, brand: 'AMD' },
  { pattern: /PowerColor/i, brand: 'PowerColor' },
  { pattern: /Sapphire/i, brand: 'Sapphire' },
  { pattern: /XFX\b/i, brand: 'XFX' },
  { pattern: /Palit/i, brand: 'Palit' },

  // CPU 브랜드
  { pattern: /인텔|Intel\b/i, brand: 'Intel' },
  { pattern: /라이젠|Ryzen/i, brand: 'AMD' },

  // RAM 브랜드
  { pattern: /코르세어|CORSAIR/i, brand: 'Corsair' },
  { pattern: /킹스턴|Kingston/i, brand: 'Kingston' },
  { pattern: /크리티컬|Crucial|중요한/i, brand: 'Crucial' },
  { pattern: /G\.SKI[LS]L?/i, brand: 'G.Skill' },
  { pattern: /패트리어트|Patriot/i, brand: 'Patriot' },
  { pattern: /복수\s*DDR|Vengeance\s*DDR/i, brand: 'Corsair' },  // "복수" = "vengeance" in Korean
  { pattern: /트라이던트|Trident/i, brand: 'G.Skill' },
  { pattern: /TeamGroup|팀그룹/i, brand: 'TeamGroup' },
  { pattern: /\bADATA\b/i, brand: 'ADATA' },
  { pattern: /Silicon\s*Power|실리콘 파워/i, brand: 'Silicon Power' },

  // SSD/Storage 브랜드
  { pattern: /WD_BLACK|WD\s*블루|WD\s*레드|Western\s*Digital|웨스턴\s*디지털/i, brand: 'Western Digital' },
  { pattern: /Sandisk|샌디스크/i, brand: 'SanDisk' },
  { pattern: /\bSAMSUNG\b/i, brand: 'Samsung' },
  { pattern: /삼성\s*(980|990|970|870|860)/i, brand: 'Samsung' },
  { pattern: /SK\s*하이닉스.*P41|Platinum\s*P41/i, brand: 'SK Hynix' },
  { pattern: /Seagate|씨게이트/i, brand: 'Seagate' },
  { pattern: /Toshiba|도시바/i, brand: 'Toshiba' },
  { pattern: /Crucial\s*(P5|MX|BX)/i, brand: 'Crucial' },
  { pattern: /Fanxiang/i, brand: 'Fanxiang' },
  { pattern: /판샹/i, brand: '판샹' },
  { pattern: /Netac/i, brand: 'Netac' },
  { pattern: /KingSpec/i, brand: 'KingSpec' },
  { pattern: /HUADISK/i, brand: 'HUADISK' },

  // 쿨러 브랜드
  { pattern: /Noctua/i, brand: 'Noctua' },
  { pattern: /Cooler\s*Master|쿨러마스터/i, brand: 'Cooler Master' },
  { pattern: /잘만|Zalman/i, brand: 'Zalman' },
  { pattern: /be\s*quiet/i, brand: 'be quiet!' },
  { pattern: /ARCTIC\b/i, brand: 'ARCTIC' },

  // 기타
  { pattern: /LIAN.LI|리안리/i, brand: 'Lian Li' },
  { pattern: /Supermicro/i, brand: 'Supermicro' },
  { pattern: /Seasonic/i, brand: 'Seasonic' },
];

function extractBrand(name: string): string | null {
  for (const rule of BRAND_RULES) {
    const match = name.match(rule.pattern);
    if (match) {
      // $1 치환 처리
      if (rule.brand === '$1' && match[1]) {
        return match[1].trim();
      }
      return rule.brand;
    }
  }
  return null;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://pcpriceUser:!asd123456@localhost:5432/pcpricetrack' });
  const db = drizzle(pool);

  const listings = await db.execute(sql`
    SELECT p.id, p.name, p.brand
    FROM products p
    JOIN product_listings pl ON pl.product_id = p.id
    JOIN stores s ON s.id = pl.store_id
    WHERE s.name = '11번가'
    GROUP BY p.id, p.name, p.brand
  `);

  console.log(`\n총 ${listings.rows.length}개 11번가 상품 처리 중...\n`);

  let updated = 0;
  let skipped = 0;
  for (const row of listings.rows as { id: string; name: string; brand: string }[]) {
    const newBrand = extractBrand(row.name);
    if (newBrand && newBrand !== row.brand) {
      await db.execute(sql`UPDATE products SET brand = ${newBrand} WHERE id = ${row.id}`);
      console.log(`✓ "${row.name.slice(0, 55)}" → "${newBrand}"`);
      updated++;
    } else if (!newBrand) {
      skipped++;
    }
  }

  console.log(`\n${updated}개 업데이트, ${skipped}개 브랜드 미감지`);
  await pool.end();
}

main().catch(console.error);
