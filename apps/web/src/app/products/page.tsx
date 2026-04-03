import Link from 'next/link';
import { fetchProducts, fetchCategories, fetchDeals } from '@/lib/data';
import { ProductCard } from '@/components/ProductCard';
import { DealCard } from '@/components/DealCard';
import { ProductFilters } from '@/components/ProductFilters';

export const revalidate = 60;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; categoryId?: string; minPrice?: string; maxPrice?: string }>;
}) {
  const params = await searchParams;
  const page = params.page ?? '1';
  const search = params.search ?? '';
  const categoryId = params.categoryId ?? '';
  const minPrice = params.minPrice ?? '';
  const maxPrice = params.maxPrice ?? '';

  const [{ data: products, meta }, categories, deals] = await Promise.all([
    fetchProducts({ search, categoryId, minPrice, maxPrice, page }),
    fetchCategories(),
    page === '1' ? fetchDeals(5, categoryId || undefined) : Promise.resolve([]),
  ]);

  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams({ page: '1', ...(search && { search }), ...(categoryId && { categoryId }), ...(minPrice && { minPrice }), ...(maxPrice && { maxPrice }), ...overrides });
    return `/products?${p}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">상품</h1>
        <span className="text-gray-300 text-sm">{meta.total}개 상품</span>
      </div>

      {/* Filters */}
      <ProductFilters categories={categories} />

      {deals.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <span className="text-red-400">↓</span>
              {categoryId
                ? `${categories.find((c) => c.id === categoryId)?.name ?? ''} 특가`
                : '오늘의 특가'}
            </h2>
            <Link href="/deals" className="text-xs text-blue-400 hover:text-blue-300">
              전체 보기 →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} compact />
            ))}
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-gray-300">검색 결과가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex gap-2 mt-8 justify-center flex-wrap">
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildUrl({ page: String(p) })}
              className={`px-3 py-1 rounded text-sm ${
                p === meta.page
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
