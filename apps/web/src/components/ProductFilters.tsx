'use client';

import { useQueryStates, parseAsString } from 'nuqs';
import { useTransition, useState, useEffect } from 'react';

// 카테고리별 제조사 목록
const CATEGORY_BRANDS: Record<string, string[]> = {
  'CPU':      ['인텔', 'AMD'],
  '그래픽카드': ['NVIDIA', 'AMD', 'ASUS', 'MSI', 'Gigabyte', 'ZOTAC', 'Sapphire'],
  'GPU':      ['NVIDIA', 'AMD', 'ASUS', 'MSI', 'Gigabyte', 'ZOTAC', 'Sapphire'],
  '메모리':   ['Samsung', 'SK하이닉스', 'Corsair', 'G.Skill', 'Kingston', 'Crucial'],
  'RAM':      ['Samsung', 'SK하이닉스', 'Corsair', 'G.Skill', 'Kingston', 'Crucial'],
  'SSD':      ['Samsung', 'SK하이닉스', 'WD', 'Seagate', 'Crucial', 'Micron'],
  'SSD/HDD':  ['Samsung', 'SK하이닉스', 'WD', 'Seagate', 'Crucial', 'Micron'],
  'HDD':      ['WD', 'Seagate', 'Toshiba'],
  '메인보드': ['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'EVGA'],
  'Motherboard': ['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'EVGA'],
  '파워':     ['Corsair', 'Seasonic', 'be quiet!', 'EVGA', 'Antec'],
  'PSU':      ['Corsair', 'Seasonic', 'be quiet!', 'EVGA', 'Antec'],
  '쿨러':     ['Noctua', 'Corsair', 'NZXT', 'be quiet!', 'DeepCool'],
  'Cooler':   ['Noctua', 'Corsair', 'NZXT', 'be quiet!', 'DeepCool'],
};

const DEFAULT_BRANDS = ['인텔', 'AMD', 'NVIDIA', 'Samsung', 'ASUS', 'MSI', 'Corsair'];

const SORT_OPTIONS = [
  { value: 'popular',    label: '인기상품' },
  { value: 'newest',     label: '신상품순' },
  { value: 'price_asc',  label: '낮은 가격순' },
  { value: 'price_desc', label: '높은 가격순' },
  { value: 'name',       label: '상품명순' },
] as const;

interface Props {
  categoryName: string;
}

export function ProductFilters({ categoryName }: Props) {
  const [isPending, startTransition] = useTransition();

  const [params, setParams] = useQueryStates(
    {
      search:     parseAsString.withDefault(''),
      categoryId: parseAsString.withDefault(''),
      minPrice:   parseAsString.withDefault(''),
      maxPrice:   parseAsString.withDefault(''),
      brand:      parseAsString.withDefault(''),
      sortBy:     parseAsString.withDefault('newest'),
      page:       parseAsString.withDefault('1'),
    },
    { shallow: false },
  );

  const [searchInput, setSearchInput] = useState(params.search);
  const [minInput, setMinInput]       = useState(params.minPrice);
  const [maxInput, setMaxInput]       = useState(params.maxPrice);

  useEffect(() => { setSearchInput(params.search); }, [params.search]);
  useEffect(() => { setMinInput(params.minPrice); },  [params.minPrice]);
  useEffect(() => { setMaxInput(params.maxPrice); },  [params.maxPrice]);

  const apply = (values: Parameters<typeof setParams>[0]) =>
    startTransition(() => { void setParams(values); });

  const applySearch = () => apply({ search: searchInput, page: '1' });
  const applyPrice  = () => apply({ minPrice: minInput, maxPrice: maxInput, page: '1' });

  const brands = CATEGORY_BRANDS[categoryName] ?? DEFAULT_BRANDS;

  const hasFilters =
    params.search || params.brand || params.minPrice || params.maxPrice;

  return (
    <div className="mb-4">
      {/* ── 필터 패널 ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden mb-3">
        {/* 검색창 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
          <div className="relative flex-1">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) applySearch();
              }}
              placeholder="상품명을 검색하세요..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
            />
            <button
              onClick={applySearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </button>
          </div>
          {hasFilters && (
            <button
              onClick={() => {
                setSearchInput('');
                setMinInput('');
                setMaxInput('');
                apply({ search: '', brand: '', minPrice: '', maxPrice: '', sortBy: 'newest', page: '1' });
              }}
              className="shrink-0 px-3 py-2 text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              필터 초기화
            </button>
          )}
        </div>

        {/* 제조사 필터 */}
        <div className="flex items-start gap-4 px-4 py-3 border-b border-gray-700">
          <span className="shrink-0 w-14 text-xs font-semibold text-gray-400 pt-1">제조사</span>
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => {
              const isActive = params.brand === b;
              return (
                <button
                  key={b}
                  onClick={() =>
                    apply({ brand: isActive ? '' : b, page: '1' })
                  }
                  disabled={isPending}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                    isActive
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-900 border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white'
                  }`}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </div>

        {/* 가격 범위 */}
        <div className="flex items-center gap-4 px-4 py-3">
          <span className="shrink-0 w-14 text-xs font-semibold text-gray-400">가격대</span>
          <div className="flex items-center gap-2">
            <input
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyPrice(); }}
              onBlur={applyPrice}
              placeholder="최저"
              type="number"
              min="0"
              className="w-24 bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 placeholder-gray-600"
            />
            <span className="text-gray-500 text-xs">~</span>
            <input
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyPrice(); }}
              onBlur={applyPrice}
              placeholder="최고"
              type="number"
              min="0"
              className="w-24 bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 placeholder-gray-600"
            />
            <span className="text-xs text-gray-500">원</span>
          </div>
        </div>
      </div>

      {/* ── 정렬 탭 ── */}
      <div className="flex items-center gap-1">
        {SORT_OPTIONS.map(({ value, label }) => {
          const isActive = params.sortBy === value;
          return (
            <button
              key={value}
              onClick={() => apply({ sortBy: value, page: '1' })}
              disabled={isPending}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-gray-700 text-white border border-gray-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent'
              }`}
            >
              {label}
            </button>
          );
        })}
        {isPending && (
          <span className="ml-2 text-xs text-gray-500">불러오는 중...</span>
        )}
      </div>
    </div>
  );
}
