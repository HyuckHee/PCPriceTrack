'use client';

import Link from 'next/link';
import { useCurrency } from '@/context/CurrencyContext';
import { formatPrice, formatPriceShort, convertPrice } from '@/lib/format';

interface Deal {
  id: string;
  name: string;
  brand: string;
  slug: string;
  imageUrl?: string | null;
  categoryName: string;
  categorySlug?: string;
  currentPrice: string;
  previousPrice: string;
  originalPrice?: string | null;
  currency: string;
}

/** compact=true → 상품 목록 페이지의 작은 카드, false → 특가 페이지 전체 행 */
export function DealCard({ deal, rank, compact = false }: { deal: Deal; rank?: number; compact?: boolean }) {
  const { displayCurrency, usdToKrw } = useCurrency();

  const origCurrency = deal.currency ?? 'USD';
  const current = convertPrice(parseFloat(deal.currentPrice), origCurrency, displayCurrency, usdToKrw);

  // 정가(MSRP) 우선, 없으면 이전 수집가 폴백
  const rawListPrice = deal.originalPrice ? parseFloat(deal.originalPrice) : parseFloat(deal.previousPrice);
  const listPrice = convertPrice(rawListPrice, origCurrency, displayCurrency, usdToKrw);

  const savings = listPrice > current ? listPrice - current : 0;
  const drop = listPrice > current ? Math.round((savings / listPrice) * 100 * 10) / 10 : 0;

  const badgeClass = `text-white font-bold ${
    drop >= 20 ? 'bg-red-600' : drop >= 10 ? 'bg-orange-600' : 'bg-yellow-600'
  }`;

  if (compact) {
    return (
      <Link
        href={`/products/${deal.slug}`}
        className="bg-gray-900 border border-red-900/40 hover:border-red-700/60 rounded-xl p-3 transition-colors flex flex-col"
      >
        <div className="text-xs text-blue-400 mb-1">{deal.categoryName}</div>
        <div className="text-xs text-gray-400 mb-1">{deal.brand}</div>
        <div className="text-xs font-medium leading-snug flex-1 line-clamp-2">{deal.name}</div>
        <div className="mt-2 pt-2 border-t border-gray-800 flex items-end justify-between">
          <div>
            <div className="text-xs text-gray-500 line-through">{formatPrice(listPrice, displayCurrency)}</div>
            <div className="text-green-400 font-bold text-sm">{formatPrice(current, displayCurrency)}</div>
            {displayCurrency === 'KRW' && (
              <div className="text-xs text-gray-500">{formatPriceShort(current, displayCurrency)}</div>
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${badgeClass}`}>
            -{drop.toFixed(1)}%
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/products/${deal.slug}`}
      className="flex items-center justify-between bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl px-5 py-4 transition-colors gap-4"
    >
      <div className="flex items-center gap-4 min-w-0">
        {rank !== undefined && (
          <div className="text-lg font-bold text-gray-500 w-8 shrink-0">#{rank + 1}</div>
        )}
        <div className="min-w-0">
          <div className="text-xs text-blue-400 mb-0.5">{deal.categoryName}</div>
          <div className="text-sm text-gray-400">{deal.brand}</div>
          <div className="font-medium text-sm leading-snug truncate">{deal.name}</div>
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0 text-right">
        <div>
          <div className="text-xs text-gray-500 line-through">{formatPrice(listPrice, displayCurrency)}</div>
          <div className="font-bold text-green-400">
            {formatPrice(current, displayCurrency)}
            {displayCurrency === 'KRW' && (
              <span className="text-xs text-gray-400 font-normal ml-1">
                ({formatPriceShort(current, displayCurrency)})
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {displayCurrency === 'KRW'
              ? `₩${Math.round(savings).toLocaleString('ko-KR')} 절약`
              : `$${savings.toFixed(2)} 절약`}
          </div>
        </div>
        <div className={`text-sm px-3 py-1.5 rounded-lg ${badgeClass}`}>
          -{drop.toFixed(1)}%
        </div>
      </div>
    </Link>
  );
}
