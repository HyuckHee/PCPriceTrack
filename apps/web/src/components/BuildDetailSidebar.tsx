'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useBuildDetailSidebar } from '@/context/BuildDetailSidebarContext';
import { useCurrency } from '@/context/CurrencyContext';
import { formatPrice, convertPrice } from '@/lib/format';
import { BuildComponent, saveBuild } from '@/lib/data';
import { DRAG_TYPE, type DragProductPayload } from '@/lib/drag-utils';

const CATEGORY_ICONS: Record<string, string> = {
  gpu: '🎮',
  cpu: '⚡',
  ram: '💾',
  ssd: '💿',
  hdd: '💿',
  motherboard: '🖥️',
  psu: '🔌',
  cooler: '❄️',
};

const CATEGORY_LABELS: Record<string, string> = {
  gpu: '그래픽카드',
  cpu: 'CPU',
  ram: '메모리',
  ssd: 'SSD/HDD',
  hdd: 'SSD/HDD',
  motherboard: '메인보드',
  psu: '파워',
  cooler: '쿨러',
};

const CATEGORY_ORDER = ['gpu', 'cpu', 'motherboard', 'ram', 'psu', 'ssd', 'cooler'];

export default function BuildDetailSidebar() {
  const { isOpen, selectedBuild, isModified, closeSidebar, updateComponent, resetModified, notifyDeleted } = useBuildDetailSidebar();
  const { displayCurrency: currency, usdToKrw } = useCurrency();

  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [flashCat, setFlashCat] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleDelete() {
    if (!selectedBuild) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? undefined : undefined;
    if (!token) { toast.error('로그인이 필요합니다.'); return; }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/builds/${selectedBuild.id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error();
      notifyDeleted(selectedBuild.id);
      toast.success('견적이 삭제되었습니다.');
      closeSidebar();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  }

  async function handleSaveChanges() {
    if (!selectedBuild) return;
    setSaving(true);
    const result = await saveBuild(
      selectedBuild.name,
      Number(selectedBuild.budget),
      selectedBuild.currency,
      Number(selectedBuild.totalPrice ?? 0),
      selectedBuild.components,
    );
    setSaving(false);
    if (result) {
      toast.success('변경 내용을 새 견적으로 저장했습니다!');
      resetModified();
    } else {
      toast.error('저장에 실패했습니다. 로그인이 필요할 수 있습니다.');
    }
  }

  function handleDragOver(e: React.DragEvent, cat: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropTarget(cat);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  }

  function handleDrop(e: React.DragEvent, cat: string) {
    e.preventDefault();
    setDropTarget(null);
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as DragProductPayload;
      if (payload.categorySlug !== cat) {
        toast.error(`이 슬롯은 ${CATEGORY_LABELS[cat] ?? cat} 전용입니다.`);
        return;
      }
      const newComp: BuildComponent = {
        category: cat,
        categoryName: CATEGORY_LABELS[cat] ?? cat,
        productId: payload.productId,
        productName: payload.productName,
        slug: payload.slug,
        brand: payload.brand,
        imageUrl: payload.imageUrl,
        price: payload.price,
        currency: payload.currency,
        storeUrl: null,
        storeName: payload.storeNames?.split(', ')[0] ?? null,
        inStock: true,
      };
      // hdd 슬롯은 견적에서 'ssd'로 통합 처리
      const targetCat = cat === 'hdd' ? 'ssd' : cat;
      updateComponent(targetCat, { ...newComp, category: targetCat });
      setFlashCat(targetCat);
      setTimeout(() => setFlashCat(null), 800);
      toast.success(`${CATEGORY_LABELS[cat] ?? cat} 교체됨!`);
    } catch {
      // ignore
    }
  }

  const orderedComponents = selectedBuild
    ? CATEGORY_ORDER.map((cat) => ({
        cat,
        // ssd 슬롯은 hdd 카테고리 제품도 표시
        comp: selectedBuild.components.find((c) =>
          c.category === cat || (cat === 'ssd' && c.category === 'hdd'),
        ) ?? null,
      }))
    : [];

  const totalDisplay = selectedBuild?.totalPrice
    ? formatPrice(
        convertPrice(Number(selectedBuild.totalPrice), selectedBuild.currency, currency, usdToKrw),
        currency,
      )
    : null;

  return (
    <>
      {/* 배경 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-base truncate max-w-[200px]">
                {selectedBuild?.name ?? '견적 상세'}
              </h2>
              {isModified && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                  변경됨
                </span>
              )}
            </div>
            {selectedBuild && (
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(selectedBuild.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            )}
          </div>
          <button
            onClick={closeSidebar}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 드래그 힌트 */}
        <div className="px-4 pt-2 shrink-0">
          <p className="text-[11px] text-gray-500 text-center">
            📦 상품 목록에서 드래그해서 부품을 교체할 수 있습니다
          </p>
        </div>

        {/* 예산 정보 */}
        {selectedBuild && (
          <div className="px-5 py-3 border-b border-gray-800 shrink-0 flex gap-4 text-xs">
            <div>
              <span className="text-gray-500">예산</span>
              <p className="text-white font-semibold mt-0.5">
                {formatPrice(
                  convertPrice(Number(selectedBuild.budget), selectedBuild.currency, currency, usdToKrw),
                  currency,
                )}
              </p>
            </div>
            {totalDisplay && (
              <div>
                <span className="text-gray-500">총 금액</span>
                <p className="text-blue-400 font-semibold mt-0.5">{totalDisplay}</p>
              </div>
            )}
          </div>
        )}

        {/* 부품 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {orderedComponents.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-10">부품 정보가 없습니다.</p>
          ) : (
            orderedComponents.map(({ cat, comp }) => (
              <div
                key={cat}
                onDragOver={(e) => handleDragOver(e, cat)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, cat)}
                className={`border rounded-xl p-3 flex gap-3 transition-all duration-300 ${
                  flashCat === cat
                    ? 'bg-green-900/30 border-green-500 ring-2 ring-green-500/60 scale-[1.02]'
                    : dropTarget === cat
                    ? 'bg-blue-900/20 border-blue-500/70 ring-1 ring-blue-500/50'
                    : comp
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-gray-800/40 border-gray-700/40 border-dashed'
                }`}
              >
                {/* 이미지 / 아이콘 */}
                <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-700 flex items-center justify-center">
                  {comp?.imageUrl ? (
                    <Image src={comp.imageUrl} alt={comp.productName} width={56} height={56} className="object-contain" unoptimized />
                  ) : (
                    <span className="text-2xl">{CATEGORY_ICONS[cat] ?? '📦'}</span>
                  )}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      {CATEGORY_LABELS[cat] ?? cat}
                    </span>
                    {dropTarget === cat && (
                      <span className="text-[10px] text-blue-400">← 놓기</span>
                    )}
                  </div>
                  {comp ? (
                    <>
                      <p className="text-xs text-white font-medium leading-snug line-clamp-2">
                        {comp.productName}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        {comp.storeName && (
                          <span className="text-[10px] text-gray-500">{comp.storeName}</span>
                        )}
                        <div className="ml-auto text-right">
                          {comp.originalPrice && comp.originalPrice > comp.price ? (
                            <>
                              <div className="text-[10px] text-gray-500 line-through">
                                {formatPrice(convertPrice(comp.originalPrice, comp.currency, currency, usdToKrw), currency)}
                              </div>
                              <div className="flex items-center gap-1 justify-end">
                                <span className="text-xs font-bold text-red-400">
                                  -{Math.round((1 - comp.price / comp.originalPrice) * 100)}%
                                </span>
                                <span className="text-sm font-bold text-blue-400">
                                  {formatPrice(convertPrice(comp.price, comp.currency, currency, usdToKrw), currency)}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-blue-400">
                              {formatPrice(convertPrice(comp.price, comp.currency, currency, usdToKrw), currency)}
                            </span>
                          )}
                        </div>
                      </div>
                      {comp.storeUrl && (
                        <a
                          href={comp.storeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-1.5 text-[10px] text-blue-500 hover:text-blue-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          쇼핑몰 바로가기 →
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 italic mt-1">여기에 드래그해서 추가</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-4 border-t border-gray-700 shrink-0 space-y-2">
          {totalDisplay && (
            <div className="flex justify-between items-center py-2 px-3 bg-blue-900/30 border border-blue-700/40 rounded-lg">
              <span className="text-xs text-gray-300 font-medium">총 견적 금액</span>
              <span className="text-base font-bold text-blue-300">{totalDisplay}</span>
            </div>
          )}
          {isModified && (
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="w-full py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? '저장 중...' : '💾 변경 내용 새 견적으로 저장'}
            </button>
          )}
          <button
            onClick={handleDelete}
            className="w-full py-2 rounded-lg border border-red-700/60 text-red-400 hover:bg-red-900/30 text-sm transition-colors"
          >
            견적 삭제
          </button>
        </div>
      </aside>
    </>
  );
}
