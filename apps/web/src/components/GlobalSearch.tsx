'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAutocomplete, type AutocompleteItem } from '@/lib/data';

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AutocompleteItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 디바운스된 자동완성 요청
  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const items = await fetchAutocomplete(q);
        setResults(items);
        setIsOpen(items.length > 0);
        setActiveIdx(-1);
      } catch {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);
  }, []);

  // 입력 변경
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    search(val);
  };

  // 결과 선택
  const selectItem = (item: AutocompleteItem) => {
    setQuery('');
    setIsOpen(false);
    setResults([]);
    router.push(`/products/${item.slug}`);
  };

  // 전체 검색으로 이동
  const goToSearch = () => {
    if (!query.trim()) return;
    setIsOpen(false);
    setResults([]);
    router.push(`/products?search=${encodeURIComponent(query.trim())}`);
    setQuery('');
  };

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (e.key === 'Enter') {
      if (activeIdx >= 0 && activeIdx < results.length) {
        selectItem(results[activeIdx]);
      } else {
        goToSearch();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    }
  };

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        {/* 돋보기 아이콘 */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="부품 검색..."
          className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* 드롭다운 결과 */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
          {results.map((item, idx) => (
            <button
              key={item.slug}
              onClick={() => selectItem(item)}
              onMouseEnter={() => setActiveIdx(idx)}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                idx === activeIdx ? 'bg-gray-700' : 'hover:bg-gray-700/50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-100 truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{item.brand}</span>
                  <span className="text-xs text-gray-500">{item.categoryName}</span>
                  {item.keySpec && (
                    <span className="text-xs text-blue-400">{item.keySpec}</span>
                  )}
                </div>
              </div>
              {item.currentPrice && (
                <span className="shrink-0 text-sm font-semibold text-green-400">
                  {Number(item.currentPrice).toLocaleString()}{item.currency === 'KRW' ? '원' : '$'}
                </span>
              )}
            </button>
          ))}
          {/* 전체 검색 링크 */}
          <button
            onClick={goToSearch}
            className="w-full text-left px-3 py-2 text-xs text-blue-400 hover:bg-gray-700/50 border-t border-gray-700 transition-colors"
          >
            &quot;{query}&quot; 전체 검색 결과 보기 →
          </button>
        </div>
      )}
    </div>
  );
}
