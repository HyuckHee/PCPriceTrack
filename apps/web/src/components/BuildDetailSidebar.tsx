'use client';

import Image from 'next/image';
import { toast } from 'sonner';
import { useBuildDetailSidebar } from '@/context/BuildDetailSidebarContext';
import { useCurrency } from '@/context/CurrencyContext';
import { formatPrice, convertPrice } from '@/lib/format';

const CATEGORY_ICONS: Record<string, string> = {
  gpu: '🎮',
  cpu: '⚡',
  ram: '💾',
  ssd: '💿',
};

const CATEGORY_LABELS: Record<string, string> = {
  gpu: '그래픽카드',
  cpu: 'CPU',
  ram: '메모리',
  ssd: 'SSD',
};

const CATEGORY_ORDER = ['gpu', 'cpu', 'ram', 'ssd'];

export default function BuildDetailSidebar() {
  const { isOpen, selectedBuild, closeSidebar } = useBuildDetailSidebar();
  const { displayCurrency: currency, usdToKrw } = useCurrency();

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
      toast.success('견적이 삭제되었습니다.');
      closeSidebar();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  }

  const orderedComponents = selectedBuild
    ? CATEGORY_ORDER
        .map((cat) => selectedBuild.components.find((c) => c.category === cat))
        .filter(Boolean)
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
            <h2 className="text-white font-bold text-base truncate max-w-[220px]">
              {selectedBuild?.name ?? '견적 상세'}
            </h2>
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
            orderedComponents.map((comp) => {
              if (!comp) return null;
              const displayPrice = formatPrice(
                convertPrice(comp.price, comp.currency, currency, usdToKrw),
                currency,
              );
              return (
                <div
                  key={comp.productId}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex gap-3"
                >
                  {/* 이미지 */}
                  <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-700 flex items-center justify-center">
                    {comp.imageUrl ? (
                      <Image src={comp.imageUrl} alt={comp.productName} width={56} height={56} className="object-contain" unoptimized />
                    ) : (
                      <span className="text-2xl">{CATEGORY_ICONS[comp.category] ?? '📦'}</span>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        {CATEGORY_LABELS[comp.category] ?? comp.category}
                      </span>
                    </div>
                    <p className="text-xs text-white font-medium leading-snug line-clamp-2">
                      {comp.productName}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      {comp.storeName && (
                        <span className="text-[10px] text-gray-500">{comp.storeName}</span>
                      )}
                      <span className="text-sm font-bold text-blue-400 ml-auto">{displayPrice}</span>
                    </div>
                    {comp.storeUrl && (
                      <a
                        href={comp.storeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-1.5 text-[10px] text-blue-500 hover:text-blue-400 transition-colors"
                      >
                        쇼핑몰 바로가기 →
                      </a>
                    )}
                  </div>
                </div>
              );
            })
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
