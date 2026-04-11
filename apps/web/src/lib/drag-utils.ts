/** 견적 짜기 드래그 앤 드롭 공유 유틸 */

export const DRAG_TYPE = 'application/pcpt-product';

export const CATEGORY_NAME_TO_SLUG: Record<string, string> = {
  '그래픽카드': 'gpu',
  'CPU': 'cpu',
  '메모리': 'ram',
  'SSD': 'ssd',
};

export const CATEGORY_ICONS: Record<string, string> = {
  gpu: '🎮',
  cpu: '⚡',
  ram: '💾',
  ssd: '💿',
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

/** 드래그 시 커스텀 ghost 이미지를 생성하고 등록합니다 */
export function setDragGhost(
  e: React.DragEvent<HTMLElement>,
  opts: { imageUrl: string | null; name: string; categorySlug: string },
) {
  const ghost = document.createElement('div');
  ghost.style.cssText = [
    'position:fixed', 'top:-9999px', 'left:-9999px',
    'width:130px', 'padding:10px 8px 8px',
    'background:#111827', 'border:1px solid #3b82f6',
    'border-radius:12px', 'box-shadow:0 8px 30px rgba(0,0,0,0.7)',
    'display:flex', 'flex-direction:column', 'align-items:center', 'gap:6px',
    'font-family:sans-serif',
  ].join(';');

  if (opts.imageUrl) {
    const img = document.createElement('img');
    img.src = opts.imageUrl;
    img.style.cssText = 'width:90px;height:68px;object-fit:contain;border-radius:6px;background:#1f2937';
    ghost.appendChild(img);
  } else {
    const icon = document.createElement('div');
    icon.style.cssText = 'width:90px;height:68px;display:flex;align-items:center;justify-content:center;font-size:32px;';
    icon.textContent = CATEGORY_ICONS[opts.categorySlug] ?? '📦';
    ghost.appendChild(icon);
  }

  const nameEl = document.createElement('p');
  nameEl.style.cssText = [
    'margin:0', 'font-size:10px', 'color:#e5e7eb',
    'text-align:center', 'line-height:1.4', 'max-width:114px',
    'overflow:hidden', 'display:-webkit-box',
    '-webkit-line-clamp:2', '-webkit-box-orient:vertical',
  ].join(';');
  nameEl.textContent = opts.name;
  ghost.appendChild(nameEl);

  const badge = document.createElement('span');
  badge.style.cssText = 'font-size:9px;color:#93c5fd;background:#1e3a5f;padding:2px 6px;border-radius:999px;';
  badge.textContent = '🔄 견적 교체';
  ghost.appendChild(badge);

  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 65, 55);
  setTimeout(() => document.body.removeChild(ghost), 0);
}
