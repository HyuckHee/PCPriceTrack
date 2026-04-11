'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useBuildEstimator } from '@/context/BuildEstimatorContext';
import { useBuildDetailSidebar } from '@/context/BuildDetailSidebarContext';
import { useCurrency } from '@/context/CurrencyContext';
import {
  BuildComponent,
  BuildEstimate,
  fetchBuildEstimate,
  fetchBuildAlternatives,
  saveBuild,
} from '@/lib/data';
import { convertPrice, formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DRAG_TYPE, type DragProductPayload } from '@/components/ProductCard';

const CATEGORY_ORDER = ['gpu', 'cpu', 'ram', 'ssd'];
const CATEGORY_ICONS: Record<string, string> = {
  gpu: '🎮',
  cpu: '⚡',
  ram: '💾',
  ssd: '💿',
};

const USD_PRESETS = [500, 800, 1000, 1500, 2000];
const KRW_PRESETS = [700000, 1000000, 1500000, 2000000, 3000000];

const PANEL_W = 380;
const PANEL_H = 560;

function getDefaultPos() {
  if (typeof window === 'undefined') return { x: 0, y: 80 };
  return {
    x: window.innerWidth - PANEL_W - 16,
    y: 72,
  };
}

export default function BuildEstimatorPanel() {
  const { isOpen, close } = useBuildEstimator();
  const { openSidebar } = useBuildDetailSidebar();
  const { displayCurrency: currency, usdToKrw } = useCurrency();

  // Drag state — initialize with static value to avoid SSR/client mismatch
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 80 });
  const dragging = useRef(false);
  const dragOffset = useRef({ ox: 0, oy: 0 });

  // Set real position after mount and whenever panel opens
  useEffect(() => {
    setPos(getDefaultPos());
  }, []);
  useEffect(() => {
    if (isOpen) {
      setPos(getDefaultPos());
      // 패널 열릴 때 저장된 견적 자동 로드
      loadSavedBuilds();
    }
  }, [isOpen]);

  const onHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return; // don't drag on ✕
      dragging.current = true;
      dragOffset.current = { ox: e.clientX - pos.x, oy: e.clientY - pos.y };
      e.preventDefault();
    },
    [pos],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(e.clientX - dragOffset.current.ox, window.innerWidth - PANEL_W)),
        y: Math.max(0, Math.min(e.clientY - dragOffset.current.oy, window.innerHeight - 60)),
      });
    };
    const onUp = () => { dragging.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  // 전역 드래그 감지 — 상품 카드 드래그 시작/종료
  useEffect(() => {
    const onStart = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes(DRAG_TYPE)) setIsDragging(true);
    };
    const onEnd = () => { setIsDragging(false); setDropTarget(null); };
    document.addEventListener('dragstart', onStart);
    document.addEventListener('dragend', onEnd);
    return () => {
      document.removeEventListener('dragstart', onStart);
      document.removeEventListener('dragend', onEnd);
    };
  }, []);

  // Form state
  const [budget, setBudget] = useState<number>(1000);
  const [inputValue, setInputValue] = useState<string>('1000');
  const [estimate, setEstimate] = useState<BuildEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [buildName, setBuildName] = useState('나의 조립 PC');
  const [tab, setTab] = useState<'estimate' | 'saved'>('estimate');
  const [savedBuilds, setSavedBuilds] = useState<
    { id: string; name: string; budget: string; currency: string; totalPrice: string | null; components: BuildComponent[]; createdAt: string }[]
  >([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Swap state
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [swapAlts, setSwapAlts] = useState<Record<string, BuildComponent[]>>({});
  const [loadingSwap, setLoadingSwap] = useState<Record<string, boolean>>({});

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [flashCat, setFlashCat] = useState<string | null>(null);

  useEffect(() => {
    if (currency === 'KRW') {
      setBudget(1500000);
      setInputValue('1500000');
    } else {
      setBudget(1000);
      setInputValue('1000');
    }
    setEstimate(null);
  }, [currency]);

  const presets = currency === 'KRW' ? KRW_PRESETS : USD_PRESETS;

  function handleBudgetInput(val: string) {
    setInputValue(val);
    const n = parseInt(val.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n) && n > 0) setBudget(n);
  }

  function handlePreset(val: number) {
    setBudget(val);
    setInputValue(String(val));
  }

  async function loadSavedBuilds() {
    setLoadingSaved(true);
    const { fetchSavedBuilds } = await import('@/lib/data');
    const builds = await fetchSavedBuilds(20);
    setSavedBuilds(builds as typeof savedBuilds);
    setLoadingSaved(false);
  }

  async function handleEstimate() {
    setLoading(true);
    setEstimate(null);
    setSwapTarget(null);
    setSwapAlts({});
    const result = await fetchBuildEstimate(budget, currency);
    setEstimate(result);
    setLoading(false);
  }

  async function handleSave() {
    if (!estimate) return;
    setSaving(true);
    const validComponents = estimate.components.filter(Boolean) as BuildComponent[];
    const result = await saveBuild(buildName, estimate.budget, estimate.currency, estimate.totalPrice, validComponents);
    setSaving(false);
    if (result) {
      toast.success('견적이 저장되었습니다!');
      loadSavedBuilds();
    } else {
      toast.error('저장에 실패했습니다.');
    }
  }

  async function handleSwapOpen(cat: string, currentComp: BuildComponent | null) {
    if (swapTarget === cat) {
      setSwapTarget(null);
      return;
    }
    setSwapTarget(cat);
    if (swapAlts[cat]) return; // already cached

    setLoadingSwap((prev) => ({ ...prev, [cat]: true }));
    const allocation = estimate ? estimate.budget * ({ gpu: 0.40, cpu: 0.25, ram: 0.20, ssd: 0.15 }[cat] ?? 0.25) : 0;
    const alts = await fetchBuildAlternatives(
      cat,
      allocation,
      estimate?.currency ?? currency,
      currentComp?.productId,
    );
    setSwapAlts((prev) => ({ ...prev, [cat]: alts }));
    setLoadingSwap((prev) => ({ ...prev, [cat]: false }));
  }

  function selectAlternative(cat: string, alt: BuildComponent) {
    if (!estimate) return;
    const newComponents = estimate.components.map((c) =>
      c?.category === cat ? { ...alt, budgetAllocation: c?.budgetAllocation } : c,
    );
    const newTotal = newComponents.reduce((sum, c) => sum + (c?.price ?? 0), 0);
    setEstimate({ ...estimate, components: newComponents, totalPrice: newTotal });
    setSwapTarget(null);
    // Invalidate cache for this category so next open re-fetches with new excludeId
    setSwapAlts((prev) => { const next = { ...prev }; delete next[cat]; return next; });
  }

  function handleDragOver(e: React.DragEvent, cat: string) {
    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
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
    setIsDragging(false);
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as DragProductPayload;
      if (payload.categorySlug !== cat) {
        toast.error(`이 슬롯은 ${CATEGORY_ICONS[cat]} ${cat.toUpperCase()} 전용입니다.`);
        return;
      }
      if (!estimate) {
        toast.error('먼저 견적을 계산한 후 교체해주세요.');
        return;
      }
      const catLabel: Record<string, string> = { gpu: '그래픽카드', cpu: 'CPU', ram: '메모리', ssd: 'SSD' };
      const newComp: BuildComponent = {
        category: cat,
        categoryName: catLabel[cat] ?? cat,
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
      const newComponents = estimate.components.map((c) =>
        c?.category === cat ? { ...newComp, budgetAllocation: c?.budgetAllocation } : c,
      );
      if (!newComponents.find((c) => c?.category === cat)) newComponents.push(newComp);
      const newTotal = newComponents.reduce((s, c) => s + (c?.price ?? 0), 0);
      setEstimate({ ...estimate, components: newComponents, totalPrice: newTotal });
      // Invalidate swap cache for this category
      setSwapAlts((prev) => { const next = { ...prev }; delete next[cat]; return next; });
      setFlashCat(cat);
      setTimeout(() => setFlashCat(null), 800);
      toast.success(`${catLabel[cat] ?? cat} 교체됨!`);
    } catch {
      // ignore
    }
  }

  function handleTabChange(t: 'estimate' | 'saved') {
    setTab(t);
    if (t === 'saved') loadSavedBuilds();
  }

  const components = estimate
    ? CATEGORY_ORDER.map((cat) => estimate.components.find((c) => c?.category === cat) ?? null)
    : [];

  const displayTotal =
    estimate && estimate.totalPrice > 0
      ? formatPrice(convertPrice(estimate.totalPrice, estimate.currency, currency, usdToKrw), currency)
      : null;

  return (
    <div
      style={{ left: pos.x, top: pos.y, width: PANEL_W, maxHeight: PANEL_H }}
      className={`fixed z-50 flex flex-col bg-gray-900 border border-gray-700 rounded-xl shadow-2xl transition-opacity duration-200 select-none ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-modal="true"
      role="dialog"
      aria-label="조립 PC 견적 계산기"
    >
      {/* Draggable header */}
      <div
        onMouseDown={onHeaderMouseDown}
        className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0 cursor-move rounded-t-xl bg-gray-800/60"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 select-none">⠿</span>
          <h2 className="text-sm font-bold text-white">🖥️ 조립 PC 견적</h2>
        </div>
        <button
          onClick={close}
          className="text-gray-400 hover:text-white transition-colors text-base leading-none cursor-pointer"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <Tabs value={tab} onValueChange={(v) => handleTabChange(v as 'estimate' | 'saved')} className="flex flex-col h-full">
          <TabsList className="w-full rounded-none border-b border-gray-700 bg-transparent h-auto p-0 shrink-0">
            <TabsTrigger value="estimate" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-400 py-2 text-xs">
              견적 계산
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-400 py-2 text-xs gap-1.5">
              저장된 견적
              {savedBuilds.length > 0 && (
                <Badge variant="default" className="w-4 h-4 p-0 flex items-center justify-center text-[10px] rounded-full">
                  {savedBuilds.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="estimate" className="mt-0 flex-1">
        <div className="p-4 space-y-3">
            {/* Budget input */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                총 예산 ({currency})
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={(e) => handleBudgetInput(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-base font-semibold"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {presets.map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={budget === p ? 'default' : 'preset'}
                    onClick={() => handlePreset(p)}
                    className="rounded-full h-6 text-xs px-2.5"
                  >
                    {currency === 'KRW' ? `${(p / 10000).toFixed(0)}만` : `$${p.toLocaleString()}`}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleEstimate}
              disabled={loading || budget < 100}
              className="w-full"
            >
              {loading ? '계산 중...' : '견적 계산하기'}
            </Button>

            {/* 드래그 힌트 배너 */}
            {isDragging && (
              <div className="rounded-lg bg-blue-900/30 border border-blue-500/50 px-3 py-2 text-xs text-blue-300 text-center animate-pulse">
                📦 원하는 슬롯에 드래그해서 놓으세요
              </div>
            )}

            {/* Results */}
            {estimate && (
              <div className="space-y-2">
                {components.map((comp, i) => {
                  const cat = CATEGORY_ORDER[i];
                  return (
                    <div
                      key={cat}
                      onDragOver={(e) => handleDragOver(e, cat)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, cat)}
                      className={`rounded-lg border transition-all duration-300 ${
                        flashCat === cat
                          ? 'bg-green-900/30 border-green-500 ring-2 ring-green-500/60 scale-[1.02]'
                          : dropTarget === cat
                          ? 'bg-blue-900/20 border-blue-500/60 ring-1 ring-blue-500/40'
                          : comp
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-gray-800/40 border-gray-700/50 opacity-60'
                      } ${swapTarget === cat && flashCat !== cat && dropTarget !== cat ? 'border-blue-500/70' : ''}`}
                    >
                      <div className="p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm">{CATEGORY_ICONS[cat]}</span>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {comp?.categoryName ?? cat.toUpperCase()}
                          </span>
                          {comp && !isDragging && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${comp.inStock ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                              {comp.inStock ? '재고있음' : '품절'}
                            </span>
                          )}
                          {dropTarget === cat ? (
                            <span className="ml-auto text-xs text-blue-400 font-medium animate-pulse">← 놓기</span>
                          ) : isDragging ? (
                            <span className="ml-auto text-xs text-gray-500">↑ 여기에 드롭</span>
                          ) : (
                            <button
                              onClick={() => handleSwapOpen(cat, comp)}
                              className={`ml-auto text-xs px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                                swapTarget === cat
                                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                                  : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
                              }`}
                            >
                              {swapTarget === cat ? '닫기' : '🔄 교체'}
                            </button>
                          )}
                        </div>
                        {comp ? (
                          <div className="flex items-center gap-2">
                            {comp.imageUrl && (
                              <div className="w-9 h-9 relative shrink-0 rounded overflow-hidden bg-gray-700">
                                <Image src={comp.imageUrl} alt={comp.productName} fill className="object-contain" unoptimized />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white font-medium leading-snug line-clamp-2">{comp.productName}</p>
                              {comp.storeName && <p className="text-xs text-gray-500">{comp.storeName}</p>}
                            </div>
                            <p className="text-sm font-bold text-blue-400 shrink-0">
                              {formatPrice(convertPrice(comp.price, comp.currency, currency, usdToKrw), currency)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 italic">
                            {isDragging ? '여기에 드래그해서 추가' : '예산 내 제품 없음'}
                          </p>
                        )}
                      </div>

                      {/* 교체 대안 목록 */}
                      {swapTarget === cat && (
                        <div className="border-t border-gray-700 px-2.5 pb-2.5 pt-2 space-y-1.5">
                          <p className="text-xs text-gray-400 font-medium mb-1.5">다른 제품 선택</p>
                          {loadingSwap[cat] ? (
                            <p className="text-xs text-gray-500 text-center py-2">불러오는 중...</p>
                          ) : (swapAlts[cat]?.length ?? 0) === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-2">대안 제품이 없습니다</p>
                          ) : (
                            swapAlts[cat].map((alt) => (
                              <div key={alt.productId} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-700/50 transition-colors">
                                {alt.imageUrl && (
                                  <div className="w-8 h-8 relative shrink-0 rounded overflow-hidden bg-gray-700">
                                    <Image src={alt.imageUrl} alt={alt.productName} fill className="object-contain" unoptimized />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-white leading-snug line-clamp-2">{alt.productName}</p>
                                  <p className="text-xs text-blue-400 font-bold">
                                    {formatPrice(convertPrice(alt.price, alt.currency, currency, usdToKrw), currency)}
                                  </p>
                                </div>
                                <button
                                  onClick={() => selectAlternative(cat, alt)}
                                  className="shrink-0 text-xs px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium cursor-pointer transition-colors"
                                >
                                  선택
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {displayTotal && (
                  <div className="rounded-lg bg-blue-900/30 border border-blue-700/50 px-3 py-2 flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-300">총 예상 금액</span>
                    <span className="text-base font-bold text-blue-300">{displayTotal}</span>
                  </div>
                )}

                <div className="space-y-1.5 pt-0.5">
                  <input
                    type="text"
                    value={buildName}
                    onChange={(e) => setBuildName(e.target.value)}
                    maxLength={200}
                    placeholder="견적 이름"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-green-700 hover:bg-green-600 text-white text-xs"
                    size="sm"
                  >
                    {saving ? '저장 중...' : '💾 이 견적 저장하기'}
                  </Button>
                </div>
              </div>
            )}

            {estimate && estimate.components.every((c) => c === null) && (
              <p className="text-center py-4 text-gray-500 text-xs">
                해당 예산에 맞는 제품을 찾지 못했습니다.
              </p>
            )}
          </div>
          </TabsContent>

          <TabsContent value="saved" className="mt-0 flex-1">
          <div className="p-4 space-y-2">
            {loadingSaved ? (
              <p className="text-center py-6 text-gray-500 text-xs">불러오는 중...</p>
            ) : savedBuilds.length === 0 ? (
              <p className="text-center py-6 text-gray-500 text-xs">저장된 견적이 없습니다.</p>
            ) : (
              savedBuilds.map((build) => (
                <div key={build.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-white text-xs">{build.name}</p>
                    <span className="text-xs text-gray-500">{new Date(build.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400">
                    <span>예산: {formatPrice(Number(build.budget), build.currency)}</span>
                    {build.totalPrice && <span>합계: {formatPrice(Number(build.totalPrice), build.currency)}</span>}
                  </div>
                  <div className="space-y-1">
                    {build.components.map((c) => (
                      <div key={c.productId} className="flex justify-between text-xs">
                        <span className="text-gray-400 truncate">{CATEGORY_ICONS[c.category]} {c.productName}</span>
                        <span className="text-blue-400 font-medium shrink-0 ml-2">{formatPrice(Number(c.price), c.currency)}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => openSidebar(build)}
                    className="w-full mt-1 py-1 text-[11px] rounded-md border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
                  >
                    상세보기 →
                  </button>
                </div>
              ))
            )}
          </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
