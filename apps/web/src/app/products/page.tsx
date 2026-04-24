import Link from 'next/link';
import { fetchProducts, fetchCategories, fetchFacets, type FacetsResponse } from '@/lib/data';
import { ProductListRow } from '@/components/ProductListRow';
import { ProductCategorySidebar } from '@/components/ProductCategorySidebar';
import { ProductFilters } from '@/components/ProductFilters';
import { Pagination } from '@/components/Pagination';

export const revalidate = 60;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    categoryId?: string;
    minPrice?: string;
    maxPrice?: string;
    brand?: string;
    brands?: string;
    sortBy?: string;
    specs?: string;
    minPerfScore?: string;
    maxPerfScore?: string;
  }>;
}) {
  const params = await searchParams;
  const page = params.page ?? '1';
  const search = params.search ?? '';
  const categoryId = params.categoryId ?? '';
  const minPrice = params.minPrice ?? '';
  const maxPrice = params.maxPrice ?? '';
  const brand = params.brand ?? '';
  const brands = params.brands ?? '';
  const sortBy = params.sortBy ?? 'newest';
  const specs = params.specs ?? '';
  const minPerfScore = params.minPerfScore ?? '';
  const maxPerfScore = params.maxPerfScore ?? '';

  let products: Awaited<ReturnType<typeof fetchProducts>>['data'] = [];
  let meta = { total: 0, page: 1, totalPages: 1 };
  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  let facets: FacetsResponse | null = null;
  let apiError = false;

  try {
    const promises: [
      ReturnType<typeof fetchProducts>,
      ReturnType<typeof fetchCategories>,
      ...(ReturnType<typeof fetchFacets>)[],
    ] = [
      fetchProducts({ search, categoryId, minPrice, maxPrice, page, brand, brands, sortBy, specs, minPerfScore, maxPerfScore }),
      fetchCategories(),
    ];

    // categoryId가 있을 때만 facets를 가져옴
    if (categoryId) {
      promises.push(fetchFacets(categoryId));
    }

    const results = await Promise.all(promises);
    const productsRes = results[0] as Awaited<ReturnType<typeof fetchProducts>>;
    const categoriesRes = results[1] as Awaited<ReturnType<typeof fetchCategories>>;
    products = productsRes.data;
    meta = productsRes.meta;
    categories = categoriesRes;

    if (categoryId && results[2]) {
      facets = results[2] as FacetsResponse;
    }
  } catch {
    apiError = true;
  }

  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams({
      page: '1',
      ...(search && { search }),
      ...(categoryId && { categoryId }),
      ...(minPrice && { minPrice }),
      ...(maxPrice && { maxPrice }),
      ...(brand && { brand }),
      ...(brands && { brands }),
      ...(sortBy && sortBy !== 'newest' && { sortBy }),
      ...(specs && { specs }),
      ...(minPerfScore && { minPerfScore }),
      ...(maxPerfScore && { maxPerfScore }),
      ...overrides,
    });
    return `/products?${p}`;
  };

  if (apiError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-gray-400">서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.</p>
        <a
          href="/products"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
        >
          새로고침
        </a>
      </div>
    );
  }

  const activeCategoryName = categoryId
    ? (categories.find((c) => c.id === categoryId)?.name ?? '')
    : '';

  // facets에서 브랜드 목록 추출
  const facetBrands = facets?.brands ?? [];

  return (
    <div className="flex gap-6 items-start">
      {/* ── Left: Category sidebar ── */}
      <ProductCategorySidebar categories={categories} />

      {/* ── Right: Filters + Products ── */}
      <div className="flex-1 min-w-0">
        {/* 카테고리 제목 + 상품 수 */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-100">
            {activeCategoryName || '전체 상품'}
            <span className="ml-2 text-sm font-normal text-gray-400">
              {meta.total.toLocaleString()}개
            </span>
          </h1>
          <Link href="/deals" className="text-xs text-blue-400 hover:text-blue-300">
            특가 보기 →
          </Link>
        </div>

        {/* 다나와 스타일 필터 패널 */}
        <ProductFilters
          categoryName={activeCategoryName}
          brands={facetBrands}
          facets={facets}
        />

        {/* 상품 목록 */}
        {products.length === 0 ? (
          <p className="text-gray-400 py-12 text-center">검색 결과가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {products.map((p) => (
              <ProductListRow key={p.id} p={p} />
            ))}
          </div>
        )}

        <Pagination
          currentPage={meta.page}
          totalPages={meta.totalPages}
          buildUrl={(p) => buildUrl({ page: p })}
        />
      </div>
    </div>
  );
}
