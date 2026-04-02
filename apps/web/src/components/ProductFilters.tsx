'use client';

import { useQueryStates, parseAsString } from 'nuqs';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

interface Category {
  id: string;
  name: string;
}

interface ProductFiltersProps {
  categories: Category[];
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [params, setParams] = useQueryStates(
    {
      search: parseAsString.withDefault(''),
      categoryId: parseAsString.withDefault(''),
      minPrice: parseAsString.withDefault(''),
      maxPrice: parseAsString.withDefault(''),
      page: parseAsString.withDefault('1'),
    },
    { shallow: false }
  );

  const hasFilters = params.search || params.categoryId || params.minPrice || params.maxPrice;

  const handleReset = () => {
    startTransition(() => {
      setParams({ search: '', categoryId: '', minPrice: '', maxPrice: '', page: '1' });
    });
  };

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      <input
        value={params.search}
        onChange={(e) =>
          startTransition(() => setParams({ search: e.target.value, page: '1' }))
        }
        placeholder="상품 검색..."
        className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
      />
      <select
        value={params.categoryId}
        onChange={(e) =>
          startTransition(() => setParams({ categoryId: e.target.value, page: '1' }))
        }
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
      >
        <option value="">전체 카테고리</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <input
          value={params.minPrice}
          onChange={(e) =>
            startTransition(() => setParams({ minPrice: e.target.value, page: '1' }))
          }
          placeholder="최저 금액"
          type="number"
          min="0"
          className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <span className="text-gray-500 text-sm">–</span>
        <input
          value={params.maxPrice}
          onChange={(e) =>
            startTransition(() => setParams({ maxPrice: e.target.value, page: '1' }))
          }
          placeholder="최고 금액"
          type="number"
          min="0"
          className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>
      {isPending && (
        <span className="text-gray-500 text-sm self-center">검색 중...</span>
      )}
      {hasFilters && (
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-lg text-sm text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          초기화
        </button>
      )}
    </div>
  );
}
