'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useBuildEstimator } from '@/context/BuildEstimatorContext';
import { useCurrency } from '@/context/CurrencyContext';
import {
  BuildComponent,
  BuildEstimate,
  fetchBuildEstimate,
  saveBuild,
} from '@/lib/data';
import { convertPrice, formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

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

            {/* Results */}
            {estimate && (
              <div className="space-y-2">
                {components.map((comp, i) => {
                  const cat = CATEGORY_ORDER[i];
                  return (
                    <div
                      key={cat}
                      className={`rounded-lg border p-2.5 ${
                        comp ? 'bg-gray-800 border-gray-700' : 'bg-gray-800/40 border-gray-700/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm">{CATEGORY_ICONS[cat]}</span>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {comp?.categoryName ?? cat.toUpperCase()}
                        </span>
                        {comp && (
                          <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium ${comp.inStock ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                            {comp.inStock ? '재고있음' : '품절'}
                          </span>
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
                        <p className="text-xs text-gray-500 italic">예산 내 제품 없음</p>
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
