import { api } from '@/lib/api';
import { DealCard } from '@/components/DealCard';
import { MOCK_DEALS } from '@/lib/mock-data';

interface Deal {
  id: string;
  name: string;
  brand: string;
  slug: string;
  imageUrl: string | null;
  categoryName: string;
  categorySlug: string;
  currentPrice: string;
  previousPrice: string;
  originalPrice: string | null;
  currency: string;
}

export const revalidate = 120;

export default async function DealsPage() {
  const deals = await api.get<Deal[]>('/products/deals?limit=50').catch(() => MOCK_DEALS as Deal[]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">가격 인하</h1>
        <span className="text-gray-400 text-sm">{deals.length}개 특가</span>
      </div>
      <p className="text-gray-400 text-sm mb-6">이전 수집 가격 대비 가장 많이 내린 상품 목록입니다.</p>

      {deals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-4">📉</div>
          <p>아직 가격 인하 상품이 없습니다.</p>
          <p className="text-sm mt-1">크롤러가 몇 번 더 실행된 후 확인해 주세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal, i) => (
            <DealCard key={deal.id} deal={deal} rank={i} />
          ))}
        </div>
      )}
    </div>
  );
}
