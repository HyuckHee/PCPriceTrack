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

/** 견적 짜기 카테고리 슬롯과 매핑되는 카테고리 이름 */
const CATEGORY_NAME_TO_SLUG: Record<string, string> = {
  '그래픽카드': 'gpu',
  'CPU': 'cpu',
  '메모리': 'ram',
  'SSD': 'ssd',
};

export interface DragProductPayload {
  productId: string;
  productName: string;
  categorySlug: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  brand: string;
  slug: string;
  storeNames: string | null;
}

export const DRAG_TYPE = 'application/pcpt-product';

export function ProductCard({ p }: { p: Product }) {
  const { displayCurrency, usdToKrw } = useCurrency();

  const categorySlug = CATEGORY_NAME_TO_SLUG[p.category.name] ?? null;
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

    // 커스텀 드래그 이미지 — 부품 이미지 + 이름 미니 카드
    const ghost = document.createElement('div');
    ghost.style.cssText = [
      'position:fixed', 'top:-9999px', 'left:-9999px',
      'width:130px', 'padding:10px 8px 8px',
      'background:#111827', 'border:1px solid #3b82f6',
      'border-radius:12px', 'box-shadow:0 8px 30px rgba(0,0,0,0.7)',
      'display:flex', 'flex-direction:column', 'align-items:center', 'gap:6px',
      'font-family:sans-serif',
    ].join(';');

    if (p.imageUrl) {
      const img = document.createElement('img');
      img.src = p.imageUrl;
      img.style.cssText = 'width:90px;height:68px;object-fit:contain;border-radius:6px;background:#1f2937';
      ghost.appendChild(img);
    } else {
      const icon = document.createElement('div');
      icon.style.cssText = 'width:90px;height:68px;display:flex;align-items:center;justify-content:center;font-size:32px;';
      icon.textContent = { gpu:'🎮', cpu:'⚡', ram:'💾', ssd:'💿' }[categorySlug] ?? '📦';
      ghost.appendChild(icon);
    }

    const nameEl = document.createElement('p');
    nameEl.style.cssText = 'margin:0;font-size:10px;color:#e5e7eb;text-align:center;line-height:1.4;max-width:114px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;';
    nameEl.textContent = p.name;
    ghost.appendChild(nameEl);

    const badge = document.createElement('span');
    badge.style.cssText = 'font-size:9px;color:#93c5fd;background:#1e3a5f;padding:2px 6px;border-radius:999px;';
    badge.textContent = '🔄 견적 교체';
    ghost.appendChild(badge);

    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 65, 55);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }

  return (
    /* draggable은 Link(<a>)가 아닌 래퍼 div에 붙여야 클릭 이벤트가 막히지 않음 */
    <div
      draggable={isDraggable}
      onDragStart={isDraggable ? handleDragStart : undefined}
      className={`relative group ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
    <Link
      href={`/products/${p.slug}`}
      className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-500 transition-colors flex flex-col relative"
    >
      {/* 드래그 힌트 뱃지 — 견적 대상 카테고리만 */}
      {isDraggable && (
        <div className="absolute top-2 right-2 text-[10px] text-gray-400 bg-gray-700 rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity select-none pointer-events-none z-10">
          ✥ 드래그
        </div>
      )}

      {p.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.imageUrl}
          alt={p.name}
          draggable={false}
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

          const showRange = maxConverted && maxConverted > minConverted * 1.01;
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
    </div>
  );
}
