'use client';

import { useQueryStates, parseAsString } from 'nuqs';
import { useTransition, useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
}

interface ProductFiltersProps {
  categories: Category[];
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const [isPending, startTransition] = useTransition();

  const [params, setParams] = useQueryStates(
    {
      search: parseAsString.withDefault(''),
      categoryId: parseAsString.withDefault(''),
      minPrice: parseAsString.withDefault(''),
      maxPrice: parseAsString.withDefault(''),
      page: parseAsString.withDefault('1'),
    },
    { shallow: false },
  );

  // 로컬 입력 state — URL은 Enter/blur/초기화 시에만 업데이트
  const [searchInput, setSearchInput] = useState(params.search);
  const [minInput, setMinInput] = useState(params.minPrice);
  const [maxInput, setMaxInput] = useState(params.maxPrice);

  // 브라우저 뒤로가기 등으로 URL 변경 시 로컬 state 동기화
  useEffect(() => { setSearchInput(params.search); }, [params.search]);
  useEffect(() => { setMinInput(params.minPrice); }, [params.minPrice]);
  useEffect(() => { setMaxInput(params.maxPrice); }, [params.maxPrice]);

  const apply = (values: Parameters<typeof setParams>[0]) =>
    startTransition(() => { void setParams(values); });

  const applySearch = () => apply({ search: searchInput, page: '1' });
  const applyPrice = () => apply({ minPrice: minInput, maxPrice: maxInput, page: '1' });

  const hasFilters = params.search || params.categoryId || params.minPrice || params.maxPrice;

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {/* 검색창 — Enter 키로만 검색 (한국어 IME 조합 완료 후) */}
      <input
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) applySearch();
        }}
        placeholder="상품 검색... (Enter)"
        className="flex-1 min-w-48 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
      />

      {/* 카테고리 — 선택 즉시 적용 */}
      <select
        value={params.categoryId}
        onChange={(e) => apply({ categoryId: e.target.value, page: '1' })}
        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
      >
        <option value="">전체 카테고리</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {/* 가격 범위 — Enter 또는 포커스 벗어날 때 적용 */}
      <div className="flex items-center gap-2">
        <input
          value={minInput}
          onChange={(e) => setMinInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyPrice(); }}
          onBlur={applyPrice}
          placeholder="최저 금액"
          type="number"
          min="0"
          className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <span className="text-gray-300 text-sm">–</span>
        <input
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyPrice(); }}
          onBlur={applyPrice}
          placeholder="최고 금액"
          type="number"
          min="0"
          className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {isPending && (
        <span className="text-gray-300 text-sm self-center">검색 중...</span>
      )}

      {hasFilters && (
        <button
          onClick={() => {
            setSearchInput('');
            setMinInput('');
            setMaxInput('');
            apply({ search: '', categoryId: '', minPrice: '', maxPrice: '', page: '1' });
          }}
          className="px-4 py-2 rounded-lg text-sm text-gray-200 bg-gray-800 hover:bg-gray-600 transition-colors"
        >
          초기화
        </button>
      )}
    </div>
  );
}
