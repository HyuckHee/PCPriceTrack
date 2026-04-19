'use client';

import Link from 'next/link';
import { useCurrency } from '@/context/CurrencyContext';
import { formatPrice, formatPriceShort, convertPrice, extractSpecBadges } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import {
  DRAG_TYPE,
  CATEGORY_NAME_TO_SLUG,
  CATEGORY_ICONS,
  setDragGhost,
  type DragProductPayload,
} from '@/lib/drag-utils';

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

export function ProductListRow({ p }: { p: Product }) {
  const { displayCurrency, usdToKrw } = useCurrency();

  const categorySlug = CATEGORY_NAME_TO_SLUG[p.category.name] ?? null;
  const categoryIcon = categorySlug ? (CATEGORY_ICONS[categorySlug] ?? '📦') : '📦';
  const isDraggable = categorySlug !== null;

  function handleDragStart(e: React.DragEvent<HTMLElement>) {
    if (!categorySlug) return;
    const price = p.minPrice ? parseFloat(p.minPrice) : 0;
    const payload: DragProductPayload = {
      productId: p.id,
      productName: p.name,
      categorySlug,
      price,
      currency: p.currency ?? 'KRW',
      imageUrl: p.imageUrl,
      brand: p.brand,
      slug: p.slug,
      storeNames: p.storeNames,
    };
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
    setDragGhost(e, { imageUrl: p.imageUrl, name: p.name, categorySlug });
  }

  // Price calculations
  const origCurrency = p.currency ?? 'KRW';
  const minRaw = p.minPrice ? parseFloat(p.minPrice) : null;
  const maxRaw = p.maxPrice ? parseFloat(p.maxPrice) : null;
  const prevRaw = p.previousMinPrice ? parseFloat(p.previousMinPrice) : null;

  const minConverted = minRaw ? convertPrice(minRaw, origCurrency, displayCurrency, usdToKrw) : null;
  const maxConverted = maxRaw ? convertPrice(maxRaw, origCurrency, displayCurrency, usdToKrw) : null;
  const prev = prevRaw ? convertPrice(prevRaw, origCurrency, displayCurrency, usdToKrw) : null;

  const showRange = minConverted && maxConverted && maxConverted > minConverted * 1.01;
  const drop =
    prev && minConverted && prev > minConverted
      ? Math.round(((prev - minConverted) / prev) * 100)
      : null;

  const specBadges = extractSpecBadges(p.name, p.category.name);

  return (
    <div
      draggable={isDraggable}
      onDragStart={isDraggable ? handleDragStart : undefined}
      className={`group bg-gray-800 border border-gray-700 rounded-xl hover:border-gray-500 transition-colors ${
        isDraggable ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <Link
        href={`/products/${p.slug}`}
        className="flex items-center gap-4 p-3 pr-4"
        draggable={false}
      >
        {/* Thumbnail */}
        <div className="shrink-0 w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden">
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.imageUrl}
              alt={p.name}
              draggable={false}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-2xl">{categoryIcon}</span>
          )}
        </div>

        {/* Name + specs */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <Badge variant="category">{p.category.name}</Badge>
            <span className="text-sm font-semibold text-gray-100 truncate">{p.brand}</span>
          </div>
          <p className="text-sm text-gray-300 line-clamp-1 leading-snug">{p.name}</p>
          {specBadges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {specBadges.slice(0, 4).map((b) => (
                <Badge key={b} variant="secondary">{b}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="shrink-0 text-right min-w-[120px]">
          {minConverted ? (
            <>
              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                <span className="text-green-400 font-bold text-sm">
                  {formatPrice(minConverted, displayCurrency)}
                </span>
                {drop && drop >= 5 && (
                  <Badge variant={drop >= 20 ? 'destructive' : drop >= 10 ? 'warning' : 'caution'}>
                    -{drop}%
                  </Badge>
                )}
              </div>
              {showRange && maxConverted && (
                <span className="text-xs text-gray-400">
                  ~ {formatPrice(maxConverted, displayCurrency)}
                </span>
              )}
              {displayCurrency === 'KRW' && (
                <div className="text-xs text-gray-500">{formatPriceShort(minConverted, 'KRW')}</div>
              )}
              {p.storeCount && p.storeCount > 0 && (
                <div className="text-xs text-gray-400 mt-0.5">{p.storeCount}개 판매처</div>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-500">가격 미확인</span>
          )}
        </div>

        {/* Drag hint */}
        {isDraggable && (
          <div className="shrink-0 ml-1 text-gray-500 group-hover:text-indigo-400 transition-colors select-none">
            <span className="text-lg">✥</span>
          </div>
        )}
      </Link>
    </div>
  );
}
