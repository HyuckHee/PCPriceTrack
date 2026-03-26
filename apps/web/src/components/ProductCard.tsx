'use client';

import Link from 'next/link';
import { useCurrency } from '@/context/CurrencyContext';
import { formatPrice, formatPriceShort, convertPrice, extractSpecBadges } from '@/lib/format';

interface Product {
  id: string;
  name: string;
  brand: string;
  slug: string;
  imageUrl: string | null;
  lowestPrice: string | null;
  lowestCurrency: string | null;
  previousLowestPrice: string | null;
  originalPrice: string | null;
  storeNames: string | null;
  category: { id: string; name: string };
}

export function ProductCard({ p }: { p: Product }) {
  const { displayCurrency, usdToKrw } = useCurrency();

  return (
    <Link
      href={`/products/${p.slug}`}
      className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors flex flex-col"
    >
      {p.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.imageUrl}
          alt={p.name}
          className="w-full h-32 object-contain mb-3 rounded"
        />
      ) : (
        <div className="w-full h-32 bg-gray-800 rounded mb-3 flex items-center justify-center text-gray-600 text-xs">
          이미지 없음
        </div>
      )}
      <div className="text-xs text-blue-400 mb-1">{p.category.name}</div>
      <div className="text-sm font-semibold text-gray-200 mb-0.5">{p.brand}</div>
      <div className="text-xs text-gray-400 leading-snug line-clamp-2 flex-1">{p.name}</div>
      {(() => {
        const badges = extractSpecBadges(p.name, p.category.name);
        return badges.length > 0 ? (
          <div className="flex flex-wrap gap-1 mt-2">
            {badges.map((b) => (
              <span
                key={b}
                className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-1.5 py-0.5 rounded"
              >
                {b}
              </span>
            ))}
          </div>
        ) : null;
      })()}
      {p.lowestPrice &&
        (() => {
          const origCurrency = p.lowestCurrency ?? 'USD';
          const rawPrice = parseFloat(p.lowestPrice);
          const current = convertPrice(rawPrice, origCurrency, displayCurrency, usdToKrw);

          const rawList = p.originalPrice ? parseFloat(p.originalPrice) : null;
          const rawPrev = rawList ?? (p.previousLowestPrice ? parseFloat(p.previousLowestPrice) : null);
          const listPrice = rawList ? convertPrice(rawList, origCurrency, displayCurrency, usdToKrw) : null;
          const prev = rawPrev ? convertPrice(rawPrev, origCurrency, displayCurrency, usdToKrw) : null;

          const savings = prev && prev > current ? prev - current : null;
          const drop = savings && prev ? Math.round((savings / prev) * 100) : null;

          return (
            <div className="mt-3 pt-3 border-t border-gray-800 space-y-1">
              {listPrice && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">정가</span>
                  <span className="text-xs text-gray-500 line-through">
                    {formatPrice(listPrice, displayCurrency)}
                  </span>
                  {displayCurrency === 'KRW' && (
                    <span className="text-xs text-gray-600">
                      ({formatPriceShort(listPrice, displayCurrency)})
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <div>
                  <span className="text-xs text-gray-500">최저 </span>
                  <span className="text-green-400 font-bold">{formatPrice(current, displayCurrency)}</span>
                  {displayCurrency === 'KRW' && (
                    <span className="text-xs text-gray-500 ml-1">
                      ({formatPriceShort(current, displayCurrency)})
                    </span>
                  )}
                </div>
                {drop && (
                  <span
                    className={`text-white text-xs font-bold px-1.5 py-0.5 rounded ${
                      drop >= 20 ? 'bg-red-600' : drop >= 10 ? 'bg-orange-600' : 'bg-yellow-600'
                    }`}
                  >
                    -{drop}%
                  </span>
                )}
              </div>
              {savings && (
                <div className="text-xs text-orange-400">{formatPrice(savings, displayCurrency)} 할인</div>
              )}
              {p.storeNames && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.storeNames.split(', ').map((store) => (
                    <span
                      key={store}
                      className="text-xs text-gray-500 bg-gray-800/60 border border-gray-700/50 px-1.5 py-0.5 rounded"
                    >
                      {store}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
    </Link>
  );
}
