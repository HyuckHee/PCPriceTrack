'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useBuildEstimator } from '@/context/BuildEstimatorContext';
import { useBuildDetailSidebar } from '@/context/BuildDetailSidebarContext';
import { useCurrency } from '@/context/CurrencyContext';
import {
  BuildComponent,
  BuildEstimate,
  BuildWarning,
  fetchBuildEstimate,
  fetchBuildAlternatives,
  saveBuild,
} from '@/lib/data';
import { convertPrice, formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DRAG_TYPE, type DragProductPayload, CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/drag-utils';

const DEFAULT_RATIO: Record<string, number> = {
  gpu: 0.35, cpu: 0.20, motherboard: 0.15, ram: 0.10, psu: 0.08, ssd: 0.08, cooler: 0.04,
};

// ── 병목 분석 ──────────────────────────────────────────────────────────────────
const PIXEL_FACTOR: Record<string, number> = { '1080p': 1.00, '1440p': 1.78, '4K': 4.00 };
const CPU_USAGE_MULTIPLIER: Record<string, number> = {
  'office': 1.5, 'gaming-fhd': 1.0, 'gaming-qhd': 1.0,
  'gaming-4k': 0.8, 'video-editing': 1.3, 'ai-workstation': 1.4,
};

interface BottleneckRow {
  resolution: string;
  bottleneckPct: number;
  limiter: 'CPU' | 'GPU' | 'none';
}

function calcBottleneck(
  components: (BuildComponent | null)[],
  usage: string,
): BottleneckRow[] | null {
  const cpuScore = components.find(c => c?.category === 'cpu')?.performanceScore ?? null;
  const gpuScore = components.find(c => c?.category === 'gpu')?.performanceScore ?? null;
  if (!cpuScore || !gpuScore) return null;
  const cpuMul = CPU_USAGE_MULTIPLIER[usage] ?? 1.0;
  return ['1080p', '1440p', '4K'].map(res => {
    const gpuEff = gpuScore / PIXEL_FACTOR[res];
    const cpuEff = cpuScore * cpuMul;
    const ratio = gpuEff / cpuEff;
    const pct = Math.round(Math.abs(1 - ratio) * 1000) / 10;
    const limiter: BottleneckRow['limiter'] = pct < 10 ? 'none' : ratio < 1 ? 'GPU' : 'CPU';
    return { resolution: res, bottleneckPct: pct, limiter };
  });
}

const RATIO_LS_KEY = 'build_ratios_v1';
const USAGE_LS_KEY = 'build_usage_v1';

const USAGE_PRESET_RATIOS: Record<string, Record<string, number>> = {
  'office':          { gpu: 0.05, cpu: 0.30, motherboard: 0.16, ram: 0.16, ssd: 0.16, cooler: 0.06, psu: 0.11 },
  'gaming-fhd':      { gpu: 0.36, cpu: 0.18, motherboard: 0.12, ram: 0.11, ssd: 0.09, cooler: 0.06, psu: 0.08 },
  'gaming-qhd':      { gpu: 0.40, cpu: 0.15, motherboard: 0.12, ram: 0.10, ssd: 0.09, cooler: 0.06, psu: 0.08 },
  'gaming-4k':       { gpu: 0.47, cpu: 0.13, motherboard: 0.10, ram: 0.09, ssd: 0.08, cooler: 0.05, psu: 0.08 },
  'video-editing':   { gpu: 0.21, cpu: 0.27, motherboard: 0.11, ram: 0.16, ssd: 0.11, cooler: 0.06, psu: 0.08 },
  'ai-workstation':  { gpu: 0.38, cpu: 0.16, motherboard: 0.11, ram: 0.14, ssd: 0.09, cooler: 0.06, psu: 0.06 },
};

const USD_PRESETS = [500, 800, 1000, 1500, 2000];
const KRW_PRESETS = [700000, 1000000, 1500000, 2000000, 3000000];

const PANEL_W = 380;
const PANEL_H = 700;

function getDefaultPos() {
  if (typeof window === 'undefined') return { x: 0, y: 80 };
  return {
    x: window.innerWidth - PANEL_W - 16,
    y: 72,
  };
}

export default function BuildEstimatorPanel() {
  const { isOpen, close, pendingBudget, clearPendingBudget, setComponents } = useBuildEstimator();
  const { openSidebar, lastDeletedId } = useBuildDetailSidebar();
  const { displayCurrency: currency, usdToKrw } = useCurrency();
  const router = useRouter();

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
      loadSavedBuilds();
    }
  }, [isOpen]);

  // 사이드바에서 "다시 견적짜기"로 열린 경우 예산 적용
  useEffect(() => {
    if (!isOpen || !pendingBudget) return;
    setBudget(pendingBudget.budget);
    setInputValue(String(pendingBudget.budget));
    setEstimate(null);
    setSwapTarget(null);
    setSwapAlts({});
    setTab('estimate');
    clearPendingBudget();
  }, [isOpen, pendingBudget, clearPendingBudget]);

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
      const types = e.dataTransfer?.types;
      if (types && Array.from(types).includes(DRAG_TYPE)) {
        setIsDragging(true);
        try {
          const raw = e.dataTransfer!.getData(DRAG_TYPE);
          draggingCategory.current = (JSON.parse(raw) as DragProductPayload).categorySlug;
        } catch { draggingCategory.current = null; }
      }
    };
    const onEnd = () => {
      setIsDragging(false);
      setIsDragOverPanel(false);
      panelDragCount.current = 0;
      draggingCategory.current = null;
    };
    document.addEventListener('dragstart', onStart);
    document.addEventListener('dragend', onEnd);
    return () => {
      document.removeEventListener('dragstart', onStart);
      document.removeEventListener('dragend', onEnd);
    };
  }, []);

  // 용도 선택
  const [usage, setUsage] = useState<string>('gaming-fhd');

  function selectUsage(value: string) {
    setUsage(value);
    const preset = USAGE_PRESET_RATIOS[value];
    if (preset) setRatios({ ...preset });
    if (typeof window !== 'undefined') localStorage.setItem(USAGE_LS_KEY, value);
  }

  const USAGE_OPTIONS = [
    { value: 'office',          label: '사무/웹',    desc: '문서 작업·웹서핑 위주. CPU 중심으로 예산을 배분하며, 저예산 시 GPU를 생략해 비용을 절감합니다.' },
    { value: 'gaming-fhd',      label: '게이밍 FHD', desc: '1080p 게이밍. CPU·GPU를 균형 있게 선택하며, GPU에 예산의 약 28~42%를 배정합니다.' },
    { value: 'gaming-qhd',      label: '게이밍 QHD', desc: '1440p 게이밍. FHD 대비 GPU 비중이 높아지고(32~46%), 최소 GPU 성능 기준도 올라갑니다.' },
    { value: 'gaming-4k',       label: '게이밍 4K',  desc: '4K 게이밍. GPU에 예산의 최대 52%를 집중하며, 최상위 GPU 성능 기준을 적용합니다.' },
    { value: 'video-editing',   label: '영상편집',   desc: '영상 렌더링·편집 특화. CPU 기준이 가장 높고 RAM·SSD 비중도 커서, 대용량 파일 처리에 최적화합니다.' },
    { value: 'ai-workstation',  label: 'AI/3D',     desc: 'AI 추론·3D 렌더링 워크스테이션. GPU(최대 48%)와 RAM(최대 20%) 비중을 모두 높여 연산·메모리 병목을 방지합니다.' },
  ];

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

  // 비율 설정 — 초기값은 gaming-fhd 프리셋, 마운트 후 localStorage에서 덮어씀
  const [ratios, setRatios] = useState<Record<string, number>>({ ...USAGE_PRESET_RATIOS['gaming-fhd'] });

  useEffect(() => {
    try {
      // null = 미방문(키 없음), '' = 사용자가 명시적으로 용도 해제, '...' = 저장된 용도
      const savedUsage = localStorage.getItem(USAGE_LS_KEY);
      const savedRatios = localStorage.getItem(RATIO_LS_KEY);
      if (savedUsage === null) {
        // 첫 방문: 기본 usage(gaming-fhd) 프리셋 적용, 저장된 비율 무시
        setRatios({ ...USAGE_PRESET_RATIOS['gaming-fhd'] });
      } else if (savedUsage) {
        // 저장된 용도 복원 → 프리셋 비율 적용
        setUsage(savedUsage);
        if (USAGE_PRESET_RATIOS[savedUsage]) setRatios({ ...USAGE_PRESET_RATIOS[savedUsage] });
      } else if (savedRatios) {
        // usage='' (커스텀 모드): 저장된 비율 복원
        setRatios(JSON.parse(savedRatios) as Record<string, number>);
      }
    } catch { /* ignore */ }
  }, []);
  const [showRatioEditor, setShowRatioEditor] = useState(false);

  // ratios를 localStorage에 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(RATIO_LS_KEY, JSON.stringify(ratios));
    }
  }, [ratios]);

  // 사이드바에서 견적 삭제 시 로컬 목록에서 즉시 제거 (재조회 없음)
  useEffect(() => {
    if (!lastDeletedId) return;
    setSavedBuilds((prev) => prev.filter((b) => b.id !== lastDeletedId));
  }, [lastDeletedId]);

  const ratioTotal = Math.round(Object.values(ratios).reduce((s, v) => s + v * 100, 0));
  const isDefaultRatio = CATEGORY_ORDER.every(
    (cat) => Math.abs((ratios[cat] ?? 0) - DEFAULT_RATIO[cat]) < 0.001,
  );
  function handleRatioChange(cat: string, pct: number) {
    const clamped = Math.max(0, Math.min(100, pct));
    setRatios((prev) => ({ ...prev, [cat]: Math.round(clamped) / 100 }));
    // 수동 수정 시 용도 선택 해제
    if (usage) {
      setUsage('');
      if (typeof window !== 'undefined') localStorage.setItem(USAGE_LS_KEY, '');
    }
  }

  function resetRatios() {
    setRatios({ ...DEFAULT_RATIO });
  }

  // 병목 분석 상세 토글
  const [showBottleneckDetail, setShowBottleneckDetail] = useState(false);
  const [bottleneckDetailTab, setBottleneckDetailTab] = useState<'1080p' | '1440p' | '4K'>('1080p');

  // Swap state
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [swapAlts, setSwapAlts] = useState<Record<string, BuildComponent[]>>({});
  const [loadingSwap, setLoadingSwap] = useState<Record<string, boolean>>({});

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOverPanel, setIsDragOverPanel] = useState(false);
  const panelDragCount = useRef(0);
  const draggingCategory = useRef<string | null>(null); // dragstart 시 카테고리 저장
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
    const result = await fetchBuildEstimate(budget, currency, isDefaultRatio ? undefined : ratios, usage);
    setEstimate(result);
    setLoading(false);
  }

  async function handleSave() {
    if (!estimate) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      toast.error('견적 저장은 로그인 후 이용 가능합니다.');
      return;
    }
    setSaving(true);
    try {
      const validComponents = (estimate.components.filter(Boolean) as BuildComponent[]).map(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ performanceScore: _ps, specs: _sp, ...rest }: BuildComponent & { specs?: unknown }) => rest,
      );
      const result = await saveBuild(buildName, estimate.budget, estimate.currency, estimate.totalPrice, validComponents);
      if (result) {
        toast.success('견적이 저장되었습니다!');
        loadSavedBuilds();
      } else {
        toast.error('저장에 실패했습니다.');
      }
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 401) {
        toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
      } else {
        toast.error('저장에 실패했습니다.');
      }
    } finally {
      setSaving(false);
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
    const allocation = estimate ? estimate.budget * (DEFAULT_RATIO[cat] ?? 0.10) : 0;
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

  function handlePanelDragEnter() {
    panelDragCount.current++;
    setIsDragOverPanel(true);
  }

  function handlePanelDragLeave() {
    panelDragCount.current = Math.max(0, panelDragCount.current - 1);
    if (panelDragCount.current === 0) setIsDragOverPanel(false);
  }

  // 패널 어디에 드랍해도 categorySlug로 자동 교체
  function handlePanelDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    setIsDragOverPanel(false);
    panelDragCount.current = 0;
    draggingCategory.current = null;

    const raw = e.dataTransfer.getData(DRAG_TYPE);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as DragProductPayload;
      const cat = payload.categorySlug;
      if (!CATEGORY_LABELS[cat]) return;
      if (!estimate) {
        toast.error('먼저 견적을 계산한 후 교체해주세요.');
        return;
      }
      const newComp: BuildComponent = {
        category: cat,
        categoryName: CATEGORY_LABELS[cat],
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
        performanceScore: payload.performanceScore ?? null,
      };
      const newComponents = estimate.components.map((c) =>
        c?.category === cat ? { ...newComp, budgetAllocation: c?.budgetAllocation } : c,
      );
      if (!newComponents.find((c) => c?.category === cat)) newComponents.push(newComp);
      const newTotal = newComponents.reduce((s, c) => s + (c?.price ?? 0), 0);
      setEstimate({ ...estimate, components: newComponents, totalPrice: newTotal });
      setSwapAlts((prev) => { const next = { ...prev }; delete next[cat]; return next; });
      setFlashCat(cat);
      setTimeout(() => setFlashCat(null), 800);
      toast.success(`${CATEGORY_LABELS[cat]} 교체됨!`);
      if (newTotal > estimate.budget) {
        const over = newTotal - estimate.budget;
        toast.warning(`예산 초과! ${formatPrice(convertPrice(over, payload.currency, currency, usdToKrw), currency)} 초과됩니다.`);
      }
    } catch { /* ignore */ }
  }

  function handleTabChange(t: 'estimate' | 'saved') {
    setTab(t);
    if (t === 'saved') loadSavedBuilds();
  }

  const components =
    estimate && Array.isArray(estimate.components)
      ? CATEGORY_ORDER.map((cat) => estimate.components.find((c) => c?.category === cat) ?? null)
      : [];

  // estimate 변경 시 Context에 부품 목록 동기화 (호환성 필터용)
  useEffect(() => {
    if (estimate?.components) {
      setComponents(estimate.components);
    } else {
      setComponents([]);
    }
  }, [estimate, setComponents]);

  const bottleneckAnalysis = useMemo(() => calcBottleneck(components, usage), [components, usage]);

  const displayTotal =
    estimate && estimate.totalPrice > 0
      ? formatPrice(convertPrice(estimate.totalPrice, estimate.currency, currency, usdToKrw), currency)
      : null;

  const showDragOverlay = isDragging && isDragOverPanel && isOpen;

  return (
    <>
    {/* 드래그 오버 시 페이지 배경 블러 */}
    <div
      className={`fixed inset-0 z-[49] bg-black/30 backdrop-blur-sm pointer-events-none transition-opacity duration-200 ${
        showDragOverlay ? 'opacity-100' : 'opacity-0'
      }`}
    />

    <div
      style={{ left: pos.x, top: pos.y, width: PANEL_W, maxHeight: PANEL_H }}
      onDragEnter={handlePanelDragEnter}
      onDragLeave={handlePanelDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handlePanelDrop}
      className={`fixed z-50 flex flex-col bg-gray-900 border border-gray-700 rounded-xl shadow-2xl transition-opacity duration-200 select-none overflow-hidden ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-modal="true"
      role="dialog"
      aria-label="조립 PC 견적 계산기"
    >
      {/* 드래그 오버 오버레이 */}
      {showDragOverlay && (
        <div className="absolute inset-0 z-20 rounded-xl flex flex-col items-center justify-center bg-blue-950/85 backdrop-blur-[2px] pointer-events-none transition-opacity duration-150">
          <span className="text-5xl mb-3">📦</span>
          <span className="text-white font-bold text-xl tracking-wide">부품 변경하기</span>
          <span className="text-blue-300 text-xs mt-2 opacity-80">원하는 슬롯에 놓으세요</span>
        </div>
      )}
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
            {/* 용도 선택 */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="text-xs font-medium text-gray-400">용도</label>
                <div className="relative group">
                  <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-gray-500 text-gray-500 text-[9px] font-bold cursor-default select-none leading-none hover:border-gray-300 hover:text-gray-300 transition-colors">i</span>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-gray-800 border border-gray-600 rounded-lg p-3 text-xs text-gray-300 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    <p className="font-semibold text-white mb-2">용도별 자동 최적화</p>
                    <p className="text-gray-400 mb-2">용도를 선택하면 각 부품의 <span className="text-gray-200">예산 비율·최소 성능 기준·병목 감지 범위</span>가 자동으로 조정됩니다.</p>
                    <ul className="space-y-1 text-gray-400">
                      {USAGE_OPTIONS.map((opt) => (
                        <li key={opt.value}>
                          <span className="text-gray-200 font-medium">{opt.label}</span> — {opt.desc}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {USAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { selectUsage(opt.value); }}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      usage === opt.value
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

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

            {/* 예산 비율 설정 */}
            <div className="rounded-lg border border-gray-700 overflow-hidden">
              <button
                onClick={() => setShowRatioEditor((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  ⚙️ <span className="font-medium">예산 비율 설정</span>
                  {usage ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                      {USAGE_OPTIONS.find(o => o.value === usage)?.label ?? usage}
                    </span>
                  ) : !isDefaultRatio && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                      커스텀
                    </span>
                  )}
                </span>
                <span className={`font-mono text-[11px] ${ratioTotal === 100 ? 'text-green-400' : 'text-red-400'}`}>
                  합계 {ratioTotal}% {showRatioEditor ? '▲' : '▼'}
                </span>
              </button>

              {showRatioEditor && (
                <div className="border-t border-gray-700 px-3 py-2.5 space-y-2 bg-gray-800/40">
                  {CATEGORY_ORDER.map((cat) => {
                    const pct = Math.round((ratios[cat] ?? DEFAULT_RATIO[cat]) * 100);
                    return (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="text-sm w-5 text-center shrink-0">{CATEGORY_ICONS[cat]}</span>
                        <span className="text-xs text-gray-400 w-16 shrink-0">{CATEGORY_LABELS[cat]}</span>
                        <input
                          type="range"
                          min={0}
                          max={60}
                          value={pct}
                          onChange={(e) => handleRatioChange(cat, Number(e.target.value))}
                          className="flex-1 h-1.5 accent-indigo-500"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={pct}
                          onChange={(e) => handleRatioChange(cat, Number(e.target.value))}
                          className="w-12 text-center bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-xs text-gray-500 shrink-0">%</span>
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between pt-1 border-t border-gray-700/60">
                    <span className={`text-xs font-mono font-semibold ${ratioTotal === 100 ? 'text-green-400' : 'text-red-400'}`}>
                      {ratioTotal === 100 ? '✓ 합계 100%' : `⚠ 합계 ${ratioTotal}% — 100%가 되어야 합니다`}
                    </span>
                    {(!usage && !isDefaultRatio) && (
                      <button
                        onClick={resetRatios}
                        className="text-xs px-2.5 py-1 rounded-md border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
                      >
                        초기화
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleEstimate}
              disabled={loading || budget < 100 || ratioTotal !== 100}
              className="w-full"
            >
              {loading ? '계산 중...' : '견적 계산하기'}
            </Button>
            {ratioTotal !== 100 && (
              <p className="text-[11px] text-red-400 text-center -mt-1">
                비율 합계가 100%가 되어야 견적을 계산할 수 있습니다
              </p>
            )}

            {/* 드래그 힌트 배너 */}
            {isDragging && (
              <div className="rounded-lg bg-blue-900/30 border border-blue-500/50 px-3 py-2 text-xs text-blue-300 text-center animate-pulse">
                📦 원하는 슬롯에 드래그해서 놓으세요
              </div>
            )}

            {/* Results */}
            {estimate && (
              <div className="space-y-2">
                {/* 병목 분석 */}
                {bottleneckAnalysis && (
                  <div className="rounded-lg bg-gray-800 border border-gray-700 overflow-hidden">
                    {/* 요약 행 */}
                    <div className="px-3 py-2 space-y-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-gray-300">🔍 병목 분석</p>
                        <button
                          onClick={() => setShowBottleneckDetail(v => !v)}
                          className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          {showBottleneckDetail ? '접기 ▲' : '상세 보기 ▼'}
                        </button>
                      </div>
                      {bottleneckAnalysis.map(row => (
                        <div key={row.resolution} className="flex items-center gap-2 text-xs">
                          <span className="w-12 text-gray-400 font-mono text-[10px]">{row.resolution}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            row.limiter === 'none'
                              ? 'bg-green-900/50 text-green-400'
                              : row.limiter === 'CPU'
                              ? 'bg-orange-900/50 text-orange-400'
                              : 'bg-purple-900/50 text-purple-400'
                          }`}>
                            {row.limiter === 'none' ? '✅ 균형' : row.limiter === 'CPU' ? '⚠ CPU' : '⚠ GPU'}
                          </span>
                          <span className="text-gray-400 font-mono">{row.bottleneckPct.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>

                    {/* 상세 뷰 */}
                    {showBottleneckDetail && (() => {
                      const cpuScore = components.find(c => c?.category === 'cpu')?.performanceScore ?? 0;
                      const gpuScore = components.find(c => c?.category === 'gpu')?.performanceScore ?? 0;
                      const row = bottleneckAnalysis.find(r => r.resolution === bottleneckDetailTab)!;
                      const cpuMul = CPU_USAGE_MULTIPLIER[usage] ?? 1.0;
                      const gpuEff = gpuScore / PIXEL_FACTOR[bottleneckDetailTab];
                      const cpuEff = cpuScore * cpuMul;
                      const maxEff = Math.max(gpuEff, cpuEff, 1);
                      const tip =
                        row.limiter === 'none' ? '최적 균형입니다. 현 구성이 이 해상도에 잘 맞습니다.' :
                        row.limiter === 'CPU' ? `CPU가 GPU를 따라가지 못합니다. 해상도를 높이거나 CPU를 업그레이드하세요.` :
                        `GPU가 CPU를 따라가지 못합니다. GPU를 업그레이드하거나 해상도를 낮추세요.`;
                      return (
                        <div className="border-t border-gray-700 px-3 py-2.5 space-y-2.5">
                          {/* 해상도 탭 */}
                          <div className="flex gap-1">
                            {(['1080p', '1440p', '4K'] as const).map(res => (
                              <button
                                key={res}
                                onClick={() => setBottleneckDetailTab(res)}
                                className={`flex-1 py-0.5 text-[10px] rounded font-medium transition-colors ${
                                  bottleneckDetailTab === res
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                }`}
                              >
                                {res}
                              </button>
                            ))}
                          </div>
                          {/* 바 차트 */}
                          <div className="space-y-1.5">
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-blue-400 font-medium">CPU 처리량</span>
                                <span className="text-gray-400 font-mono">{Math.round(cpuEff).toLocaleString()}</span>
                              </div>
                              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(100, (cpuEff / maxEff) * 100).toFixed(1)}%` }} />
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-purple-400 font-medium">GPU 처리량</span>
                                <span className="text-gray-400 font-mono">{Math.round(gpuEff).toLocaleString()}</span>
                              </div>
                              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(100, (gpuEff / maxEff) * 100).toFixed(1)}%` }} />
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 leading-relaxed">{tip}</p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 호환성 경고 */}
                {(estimate.warnings?.length ?? 0) > 0 && (
                  <div className="rounded-lg border border-yellow-700/50 bg-yellow-900/10 px-3 py-2 space-y-1">
                    {estimate.warnings!.map((w: BuildWarning, i: number) => (
                      <div key={i} className="flex gap-1.5 text-xs">
                        <span className={w.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                          {w.severity === 'error' ? '✕' : '⚠'}
                        </span>
                        <span className={w.severity === 'error' ? 'text-red-300' : 'text-yellow-300'}>
                          {w.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {components.map((comp, i) => {
                  const cat = CATEGORY_ORDER[i];
                  return (
                    <div
                      key={cat}
                      className={`rounded-lg border transition-all duration-300 ${
                        flashCat === cat
                          ? 'bg-green-900/30 border-green-500 ring-2 ring-green-500/60 scale-[1.02]'
                          : isDragOverPanel && draggingCategory.current === cat
                          ? 'bg-blue-900/20 border-blue-500/60 ring-1 ring-blue-500/40'
                          : comp
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-gray-800/40 border-gray-700/50 opacity-60'
                      } ${swapTarget === cat && flashCat !== cat ? 'border-blue-500/70' : ''}`}
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
                          {comp?.quantity && comp.quantity > 1 && !isDragging && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-blue-900/50 text-blue-400">
                              ×{comp.quantity}
                            </span>
                          )}
                          {isDragOverPanel && draggingCategory.current === cat ? (
                            <span className="ml-auto text-xs text-blue-400 font-medium animate-pulse">← 교체됨</span>
                          ) : isDragging ? (
                            <span className="ml-auto text-xs text-gray-500 text-[10px]">패널에 놓기</span>
                          ) : (
                            <div className="ml-auto flex items-center gap-1">
                              <button
                                onClick={() => {
                                  // 해당 카테고리 예산 배분 금액 계산
                                  const allocatedBudget = Math.round(budget * (ratios[cat] ?? 0.10));
                                  const categoryName = CATEGORY_LABELS[cat];
                                  const params = new URLSearchParams({
                                    search: categoryName,
                                    maxPrice: String(allocatedBudget),
                                    sortBy: 'value_score',
                                  });
                                  router.push(`/products?${params}`);
                                }}
                                className="text-xs px-2 py-0.5 rounded-full border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white transition-colors cursor-pointer"
                                title="부품 찾기"
                              >
                                🔍
                              </button>
                              <button
                                onClick={() => handleSwapOpen(cat, comp)}
                                className={`text-xs px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                                  swapTarget === cat
                                    ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                                    : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
                                }`}
                              >
                                {swapTarget === cat ? '닫기' : '🔄 교체'}
                              </button>
                            </div>
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
                            <div className="shrink-0 text-right">
                              {comp.originalPrice && comp.originalPrice > comp.price && (() => {
                                const drop = Math.round((1 - comp.price / comp.originalPrice) * 100);
                                return drop >= 1 ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-[10px] text-gray-500 line-through">
                                      {formatPrice(convertPrice(comp.originalPrice, comp.currency, currency, usdToKrw), currency)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-bold text-red-400">-{drop}%</span>
                                      <span className="text-sm font-bold text-blue-400">
                                        {formatPrice(convertPrice(comp.price, comp.currency, currency, usdToKrw), currency)}
                                      </span>
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                              {(!comp.originalPrice || comp.originalPrice <= comp.price) && (
                                <p className="text-sm font-bold text-blue-400">
                                  {formatPrice(convertPrice(comp.price, comp.currency, currency, usdToKrw), currency)}
                                </p>
                              )}
                            </div>
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

            {estimate && Array.isArray(estimate.components) && estimate.components.every((c) => c === null) && (
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
                        <span className="text-gray-400 truncate">{CATEGORY_ICONS[c.category] ?? '📦'} {c.productName}</span>
                        <div className="shrink-0 ml-2 text-right">
                          {c.originalPrice && c.originalPrice > c.price ? (
                            <div className="flex items-center gap-1">
                              <span className="text-red-400 font-bold">
                                -{Math.round((1 - c.price / c.originalPrice) * 100)}%
                              </span>
                              <span className="text-blue-400 font-medium">{formatPrice(Number(c.price), c.currency)}</span>
                            </div>
                          ) : (
                            <span className="text-blue-400 font-medium">{formatPrice(Number(c.price), c.currency)}</span>
                          )}
                        </div>
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
    </>
  );
}
