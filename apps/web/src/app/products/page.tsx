import Link from 'next/link';
import { fetchProducts, fetchCategories, fetchDeals } from '@/lib/data';
import { ProductCard } from '@/components/ProductCard';
import { DealCard } from '@/components/DealCard';
import { ProductFilters } from '@/components/ProductFilters';
import { Pagination } from '@/components/Pagination';

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

  let products: Awaited<ReturnType<typeof fetchProducts>>['data'] = [];
  let meta = { total: 0, page: 1, totalPages: 1 };
  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  let deals: Awaited<ReturnType<typeof fetchDeals>> = [];
  let apiError = false;

  try {
    const [productsRes, categoriesRes, dealsRes] = await Promise.all([
      fetchProducts({ search, categoryId, minPrice, maxPrice, page }),
      fetchCategories(),
      page === '1' ? fetchDeals(5, categoryId || undefined) : Promise.resolve([]),
    ]);
    products = productsRes.data;
    meta = productsRes.meta;
    categories = categoriesRes;
    deals = dealsRes;
  } catch {
    apiError = true;
  }

  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams({ page: '1', ...(search && { search }), ...(categoryId && { categoryId }), ...(minPrice && { minPrice }), ...(maxPrice && { maxPrice }), ...overrides });
    return `/products?${p}`;
  };

  if (apiError) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">상품</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <p className="text-gray-400">서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.</p>
          <a
            href="/products"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
          >
            새로고침
          </a>
        </div>
      </div>
    );
  }

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

      <Pagination
        currentPage={meta.page}
        totalPages={meta.totalPages}
        buildUrl={(p) => buildUrl({ page: p })}
      />
    </div>
  );
}
