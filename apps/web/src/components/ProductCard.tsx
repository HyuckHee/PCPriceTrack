'use client';

import Link from 'next/link';
import { useCurrency } from '@/context/CurrencyContext';
import { formatPrice, formatPriceShort, convertPrice, extractSpecBadges } from '@/lib/format';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  name: string;
  brand: string;
  slug: string;
  imageUrl: string | null;
  group: { id: string; name: string; slug: string } | null;
  minPrice: string | null;
  maxPrice: string | null;
  currency: string | null;
  previousMinPrice: string | null;
  storeCount: number | null;
  storeNames: string | null;
  category: { id: string; name: string };
}

export function ProductCard({ p }: { p: Product }) {
  const { displayCurrency, usdToKrw } = useCurrency();

  return (
    <Link
      href={`/products/${p.slug}`}
      className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-500 transition-colors flex flex-col"
    >
      {p.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.imageUrl}
          alt={p.name}
          className="w-full h-32 object-contain mb-3 rounded"
        />
      ) : (
        <div className="w-full h-32 bg-gray-700 rounded mb-3 flex items-center justify-center text-gray-400 text-xs">
          이미지 없음
        </div>
      )}
      <Badge variant="category" className="mb-1 w-fit">{p.category.name}</Badge>
      <div className="text-sm font-semibold text-gray-100 mb-0.5">{p.brand}</div>
      <div className="text-xs text-gray-300 leading-snug line-clamp-2 flex-1">{p.name}</div>
      {(() => {
        const badges = extractSpecBadges(p.name, p.category.name);
        return badges.length > 0 ? (
          <div className="flex flex-wrap gap-1 mt-2">
            {badges.map((b) => (
              <Badge key={b} variant="secondary">{b}</Badge>
            ))}
          </div>
        ) : null;
      })()}
      {p.minPrice &&
        (() => {
          const origCurrency = p.currency ?? 'KRW';
          const minRaw = parseFloat(p.minPrice);
          const maxRaw = p.maxPrice ? parseFloat(p.maxPrice) : null;
          const prevRaw = p.previousMinPrice ? parseFloat(p.previousMinPrice) : null;

          const minConverted = convertPrice(minRaw, origCurrency, displayCurrency, usdToKrw);
          const maxConverted = maxRaw ? convertPrice(maxRaw, origCurrency, displayCurrency, usdToKrw) : null;
          const prev = prevRaw ? convertPrice(prevRaw, origCurrency, displayCurrency, usdToKrw) : null;

          const showRange = maxConverted && maxConverted > minConverted * 1.01; // 1% 이상 차이날 때만 범위 표시
          const drop = prev && prev > minConverted ? Math.round(((prev - minConverted) / prev) * 100) : null;

          return (
            <div className="mt-3 pt-3 border-t border-gray-700 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div>
                  <span className="text-xs text-gray-400">최저 </span>
                  <span className="text-green-400 font-bold">{formatPrice(minConverted, displayCurrency)}</span>
                  {showRange && maxConverted && (
                    <>
                      <span className="text-xs text-gray-500 mx-1">~</span>
                      <span className="text-xs text-gray-400">{formatPrice(maxConverted, displayCurrency)}</span>
                    </>
                  )}
                  {displayCurrency === 'KRW' && (
                    <span className="text-xs text-gray-500 ml-1">({formatPriceShort(minConverted, 'KRW')})</span>
                  )}
                </div>
                {drop && drop >= 5 && (
                  <Badge variant={drop >= 20 ? 'destructive' : drop >= 10 ? 'warning' : 'caution'}>
                    -{drop}%
                  </Badge>
                )}
              </div>
              {p.storeNames && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.storeNames.split(', ').map((store) => (
                    <Badge key={store} variant="store">{store}</Badge>
                  ))}
                  {p.storeCount && p.storeCount > 1 && (
                    <Badge variant="secondary">{p.storeCount}개 판매처</Badge>
                  )}
                </div>
              )}
            </div>
          );
        })()}
    </Link>
  );
}
