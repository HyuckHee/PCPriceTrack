'use client';

import { useQueryStates, parseAsString, parseAsArrayOf } from 'nuqs';
import { useTransition, useState, useEffect } from 'react';
import type { FacetsResponse } from '@/lib/data';
import { useBuildEstimator } from '@/context/BuildEstimatorContext';
import { useCompatibilityConstraints } from '@/hooks/useCompatibilityConstraints';
import { CompatibilityBanner } from './CompatibilityBanner';
import { SpecFilterPanel } from './SpecFilterPanel';

const SORT_OPTIONS = [
  { value: 'popular',     label: '인기상품' },
  { value: 'newest',      label: '신상품순' },
  { value: 'price_asc',   label: '낮은 가격순' },
  { value: 'price_desc',  label: '높은 가격순' },
  { value: 'value_score',label: '가성비순' },
  { value: 'name',        label: '상품명순' },
] as const;


interface Props {
  categoryName: string;
  brands?: string[];
  facets?: FacetsResponse | null;
}

export function ProductFilters({ categoryName, brands: facetBrands, facets }: Props) {
  const [isPending, startTransition] = useTransition();

  const [params, setParams] = useQueryStates(
    {
      search:       parseAsString.withDefault(''),
      categoryId:   parseAsString.withDefault(''),
      minPrice:     parseAsString.withDefault(''),
      maxPrice:     parseAsString.withDefault(''),
      brand:        parseAsString.withDefault(''),
      brands:       parseAsArrayOf(parseAsString, ',').withDefault([]),
      sortBy:       parseAsString.withDefault('newest'),
      page:         parseAsString.withDefault('1'),
      specs:        parseAsString.withDefault(''),
      minPerfScore: parseAsString.withDefault(''),
      maxPerfScore: parseAsString.withDefault(''),
    },
    { shallow: false },
  );

  const { components: builderComponents } = useBuildEstimator();
  const [showIncompatible, setShowIncompatible] = useState(false);

  // 현재 카테고리에 대한 호환성 제약 계산
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, '');
  const { constraints, specsFilter, activeSummary } = useCompatibilityConstraints(
    categorySlug,
    builderComponents,
  );

  const [searchInput, setSearchInput] = useState(params.search);
  const [minInput, setMinInput]       = useState(params.minPrice);
  const [maxInput, setMaxInput]       = useState(params.maxPrice);
  const [minPerfInput, setMinPerfInput] = useState(params.minPerfScore);
  const [maxPerfInput, setMaxPerfInput] = useState(params.maxPerfScore);

  useEffect(() => { setSearchInput(params.search); }, [params.search]);
  useEffect(() => { setMinInput(params.minPrice); },  [params.minPrice]);
  useEffect(() => { setMaxInput(params.maxPrice); },  [params.maxPrice]);
  useEffect(() => { setMinPerfInput(params.minPerfScore); }, [params.minPerfScore]);
  useEffect(() => { setMaxPerfInput(params.maxPerfScore); }, [params.maxPerfScore]);

  const apply = (values: Parameters<typeof setParams>[0]) =>
    startTransition(() => { void setParams(values); });

  const applySearch = () => apply({ search: searchInput, page: '1' });
  const applyPrice  = () => apply({ minPrice: minInput, maxPrice: maxInput, page: '1' });
  const applyPerfScore = () => apply({ minPerfScore: minPerfInput, maxPerfScore: maxPerfInput, page: '1' });

  // 멀티 브랜드 토글
  const toggleBrand = (b: string) => {
    const current = params.brands;
    const next = current.includes(b)
      ? current.filter((x) => x !== b)
      : [...current, b];
    apply({ brands: next, brand: '', page: '1' });
  };

  // 스펙 필터 파싱 / 업데이트
  const specsObj: Record<string, unknown> = params.specs ? (() => { try { return JSON.parse(params.specs); } catch { return {}; } })() : {};

  // 호환성 필터가 변경되면 specs 파라미터에 병합하여 URL 업데이트
  useEffect(() => {
    if (Object.keys(specsFilter).length === 0) return;
    if (showIncompatible) {
      // 토글 ON: 호환성 제약 제거, 사용자 필터만 유지
      const userOnly = { ...specsObj };
      for (const key of Object.keys(specsFilter)) {
        if (JSON.stringify(userOnly[key]) === JSON.stringify(specsFilter[key])) {
          delete userOnly[key];
        }
      }
      const str = Object.keys(userOnly).length > 0 ? JSON.stringify(userOnly) : '';
      if (str !== params.specs) apply({ specs: str, page: '1' });
    } else {
      // 토글 OFF: 호환성 제약 병합
      const merged = { ...specsObj, ...specsFilter };
      const str = JSON.stringify(merged);
      if (str !== params.specs) apply({ specs: str, page: '1' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specsFilter, showIncompatible]);

  const brands = facetBrands && facetBrands.length > 0 ? facetBrands : [];

  const hasFilters =
    params.search || params.brand || (params.brands.length > 0) ||
    params.minPrice || params.maxPrice ||
    params.specs || params.minPerfScore || params.maxPerfScore;

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
                setMinPerfInput('');
                setMaxPerfInput('');
                apply({
                  search: '', brand: '', brands: [], minPrice: '', maxPrice: '',
                  sortBy: 'newest', page: '1', specs: '', minPerfScore: '', maxPerfScore: '',
                });
              }}
              className="shrink-0 px-3 py-2 text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              필터 초기화
            </button>
          )}
        </div>

        {/* 제조사 필터 (멀티 선택) */}
        {brands.length > 0 && (
          <div className="flex items-start gap-4 px-4 py-3 border-b border-gray-700">
            <span className="shrink-0 w-14 text-xs font-semibold text-gray-400 pt-1">제조사</span>
            <div className="flex flex-wrap gap-2">
              {brands.map((b) => {
                const isActive = params.brands.includes(b) || params.brand === b;
                return (
                  <button
                    key={b}
                    onClick={() => toggleBrand(b)}
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
        )}

        {/* 가격 범위 */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-700">
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

        {/* 성능 점수 범위 */}
        {facets?.performanceScore && (
          <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-700">
            <span className="shrink-0 w-14 text-xs font-semibold text-gray-400">성능</span>
            <div className="flex items-center gap-2">
              <input
                value={minPerfInput}
                onChange={(e) => setMinPerfInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyPerfScore(); }}
                onBlur={applyPerfScore}
                placeholder={String(facets.performanceScore.min)}
                type="number"
                min="0"
                className="w-24 bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 placeholder-gray-600"
              />
              <span className="text-gray-500 text-xs">~</span>
              <input
                value={maxPerfInput}
                onChange={(e) => setMaxPerfInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyPerfScore(); }}
                onBlur={applyPerfScore}
                placeholder={String(facets.performanceScore.max)}
                type="number"
                min="0"
                className="w-24 bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 placeholder-gray-600"
              />
              <span className="text-xs text-gray-500">점</span>
            </div>
          </div>
        )}

      </div>

      {/* 호환성 배너 */}
      <CompatibilityBanner
        constraints={constraints}
        activeSummary={activeSummary}
        showIncompatible={showIncompatible}
        onToggleIncompatible={setShowIncompatible}
      />

      {/* 동적 스펙 필터 (facets 기반, 호환성 잠금 지원) */}
      <SpecFilterPanel
        facets={facets ?? null}
        categoryId={params.categoryId}
        lockedSpecs={showIncompatible ? undefined : specsFilter}
      />

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
