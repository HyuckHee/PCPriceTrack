'use client';

import { useCurrency } from '@/context/CurrencyContext';
import { formatPrice, formatPriceShort, convertPrice } from '@/lib/format';

interface Listing {
  listingId: string;
  url: string;
  latestPrice: string | null;
  latestCurrency: string | null;
  latestOriginalPrice: string | null;
  inStock: boolean | null;
  mallName?: string | null;
  store: { id: string; name: string; logoUrl: string | null };
}

export function ProductLowestPrice({ listing }: { listing: Listing }) {
  const { displayCurrency, usdToKrw } = useCurrency();
  const origCurrency = listing.latestCurrency ?? 'USD';
  const price = convertPrice(parseFloat(listing.latestPrice!), origCurrency, displayCurrency, usdToKrw);

  return (
    <div className="bg-blue-600/10 border border-blue-600/30 rounded-xl p-4 mb-6 inline-block">
      <div className="text-xs text-blue-400 mb-1">최저가</div>
      <div className="text-2xl font-bold">
        {formatPrice(price, displayCurrency)}
        {displayCurrency === 'KRW' && (
          <span className="text-sm text-gray-400 font-normal ml-2">
            ({formatPriceShort(price, 'KRW')})
          </span>
        )}
      </div>
      <div className="text-sm text-gray-400">{listing.mallName ?? listing.store.name} 기준</div>
    </div>
  );
}

export function ProductStoreList({ listings }: { listings: Listing[] }) {
  const { displayCurrency, usdToKrw } = useCurrency();

  const sortedListings = [...listings]
    .filter((l) => l.latestPrice)
    .sort((a, b) => parseFloat(a.latestPrice!) - parseFloat(b.latestPrice!));

  const noPrice = listings.filter((l) => !l.latestPrice);

  return (
    <div className="space-y-2 mb-8">
      {sortedListings.map((listing, i) => {
        const origCurrency = listing.latestCurrency ?? 'USD';
        const price = convertPrice(parseFloat(listing.latestPrice!), origCurrency, displayCurrency, usdToKrw);
        const origPrice = listing.latestOriginalPrice
          ? convertPrice(parseFloat(listing.latestOriginalPrice), origCurrency, displayCurrency, usdToKrw)
          : null;
        const hasDiscount = origPrice && origPrice > price;

        return (
          <a
            key={listing.listingId}
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between rounded-xl px-4 py-3 transition-colors border ${
              i === 0
                ? 'bg-green-600/10 border-green-600/30 hover:border-green-500/50'
                : 'bg-gray-900 border-gray-800 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">
                {listing.mallName ?? listing.store.name}
              </span>
              {listing.mallName && (
                <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                  {listing.store.name}
                </span>
              )}
              {i === 0 && (
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded">최저가</span>
              )}
              {listing.inStock === false && (
                <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded">품절</span>
              )}
            </div>
            <div className="text-right">
              {hasDiscount && (
                <div className="text-xs text-gray-500 line-through">
                  정가 {formatPrice(origPrice!, displayCurrency)}
                </div>
              )}
              <div className={`font-bold ${i === 0 ? 'text-green-400' : ''}`}>
                {formatPrice(price, displayCurrency)}
              </div>
              {hasDiscount && (
                <div className="text-xs text-orange-400">
                  {Math.round((1 - price / origPrice!) * 100)}% 할인
                </div>
              )}
            </div>
          </a>
        );
      })}
      {noPrice.map((listing) => (
        <a
          key={listing.listingId}
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl px-4 py-3 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{listing.mallName ?? listing.store.name}</span>
            {listing.mallName && (
              <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                {listing.store.name}
              </span>
            )}
          </div>
          <span className="text-gray-500">—</span>
        </a>
      ))}
    </div>
  );
}
