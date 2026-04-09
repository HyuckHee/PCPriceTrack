/**
 * 네이버쇼핑 API 직접 호출 테스트
 * 실행: tsx src/database/scripts/test-naver-api.ts [카테고리]
 * 예시: tsx src/database/scripts/test-naver-api.ts gpu
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

const CLIENT_ID = process.env.NAVER_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 미설정');
  process.exit(1);
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  gpu: ['RTX 4070 그래픽카드', 'RTX 4060 그래픽카드'],
  cpu: ['인텔 코어 i5 14600K', 'AMD 라이젠 5 7600X'],
  ram: ['DDR5 32GB PC5 램', 'DDR4 16GB 메모리'],
  ssd: ['NVMe SSD 1TB PCIe 4.0', 'NVMe SSD 2TB PCIe 5.0'],
};

const BLACKLIST = [
  '브래킷', '베젤', '배플', '플레이트', 'IO 실드', 'IO실드', '백플레이트',
  '쿨링 팬', '쿨링팬', '교체 팬', '교체팬', '그래픽카드 팬',
  'SODIMM', 'SO-DIMM', 'eGPU', 'OCuLink', 'OcuLink', '도크', '도킹',
  '거치대', '지지대', '서포터', '케이블', '전원 공급', '구리스', '열전도', '인클로저',
];
const CATEGORY_MIN_PRICE: Record<string, number> = {
  gpu: 200_000, cpu: 100_000, ram: 30_000, ssd: 30_000,
};
function isFiltered(title: string, price: number, slug: string): string | null {
  const lower = title.toLowerCase();
  const hit = BLACKLIST.find(kw => lower.includes(kw.toLowerCase()));
  if (hit) return `블랙리스트(${hit})`;
  const min = CATEGORY_MIN_PRICE[slug] ?? 0;
  if (price < min) return `최저가 미달(₩${price.toLocaleString()} < ₩${min.toLocaleString()})`;
  return null;
}

const categorySlug = process.argv[2] ?? 'gpu';
const keywords = CATEGORY_KEYWORDS[categorySlug];

if (!keywords) {
  console.error(`❌ 알 수 없는 카테고리: ${categorySlug}`);
  console.error(`사용 가능: ${Object.keys(CATEGORY_KEYWORDS).join(', ')}`);
  process.exit(1);
}

async function searchNaver(query: string) {
  const url = new URL('https://openapi.naver.com/v1/search/shop.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '5');
  url.searchParams.set('sort', 'sim');

  const res = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': CLIENT_ID!,
      'X-Naver-Client-Secret': CLIENT_SECRET!,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json() as Promise<{
    total: number;
    items: Array<{
      title: string;
      link: string;
      lprice: string;
      hprice: string;
      mallName: string;
      productId: string;
      brand: string;
      image: string;
    }>;
  }>;
}

async function main() {
  console.log(`\n네이버쇼핑 API 테스트 — 카테고리: ${categorySlug}`);
  console.log(`CLIENT_ID: ${CLIENT_ID!.slice(0, 6)}...`);
  console.log('─'.repeat(60));

  let totalFound = 0;

  for (const keyword of keywords) {
    try {
      const data = await searchNaver(keyword);
      totalFound += data.items.length;

      console.log(`\n🔍 "${keyword}" → 총 ${data.total}건 (상위 ${data.items.length}개)`);

      data.items.forEach((item, i) => {
        const title = item.title.replace(/<[^>]+>/g, '').slice(0, 60);
        const price = Number(item.lprice);
        const link = item.link?.replace(/&amp;/g, '&') ?? '';
        const linkDomain = (() => { try { return new URL(link).hostname; } catch { return link.slice(0, 40); } })();
        const filtered = isFiltered(title, price, categorySlug);
        const prefix = filtered ? `  ❌ [${filtered}]` : `  ${i + 1}.`;
        console.log(`${prefix} ${title}`);
        if (!filtered) {
          console.log(`     가격: ₩${price.toLocaleString()} | 쇼핑몰: ${item.mallName}`);
          console.log(`     링크: ${linkDomain}`);
        }
      });

      await new Promise(r => setTimeout(r, 150));
    } catch (err) {
      console.error(`  ❌ 실패: ${(err as Error).message}`);
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`✅ 완료 — 키워드 ${keywords.length}개, 총 ${totalFound}개 상품 수신`);
}

main().catch(e => {
  console.error('❌ 오류:', e.message);
  process.exit(1);
});
