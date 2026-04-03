'use client';

import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const CATEGORIES = ['gpu', 'cpu', 'ram', 'ssd', 'motherboard', 'psu', 'case', 'cooler'];

/** Naver API 일일 사용량 계산 */
const NAVER_KEYWORDS_PER_CATEGORY: Record<string, number> = {
  gpu: 9, cpu: 6, ram: 4, ssd: 4, motherboard: 4, psu: 3, case: 3, cooler: 3,
};
const DISCOVERY_CATEGORIES = ['gpu', 'cpu', 'ram', 'ssd'];

/** cron 표현식에서 하루 실행 횟수 추정 */
function estimateDailyRuns(cronExpr: string): number {
  const parts = cronExpr.trim().split(/\s+/);
  // 6-field: sec min hour day month dow
  // 5-field: min hour day month dow
  const hourPart = parts.length === 6 ? parts[2] : parts[1];
  if (hourPart === '*') return 24;
  const m = hourPart.match(/^\*\/(\d+)$/);
  if (m) return Math.floor(24 / parseInt(m[1]));
  if (/^\d+$/.test(hourPart)) return 1; // specific hour = once/day
  return 1;
}

function calcNaverUsage(schedules: ScheduleConfig[], naverListingCount: number) {
  const discoveryKeywords = DISCOVERY_CATEGORIES.reduce(
    (sum, cat) => sum + (NAVER_KEYWORDS_PER_CATEGORY[cat] ?? 0), 0,
  );

  let totalRuns = 0;
  for (const s of schedules) {
    totalRuns += estimateDailyRuns(s.cronExpr);
  }

  const discoveryCallsPerDay = totalRuns * discoveryKeywords;
  const refreshCallsPerDay = totalRuns * naverListingCount;
  const total = discoveryCallsPerDay + refreshCallsPerDay;

  return { discoveryCallsPerDay, refreshCallsPerDay, total, totalRuns };
}

interface StoreStatus {
  storeId: string;
  storeName: string;
  isActive: boolean;
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  lastJobStatus: string | null;
  lastJobAt: string | null;
  queuedJobs: number;
}

interface CrawlJob {
  id: string;
  storeId: string;
  status: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface ScheduleConfig {
  key: string;
  label: string;
  cronExpr: string;
  description: string;
  updatedAt: string | null;
}

/** 사람이 읽기 쉬운 cron 표현식 프리셋 */
const CRON_PRESETS = [
  { label: '1시간마다', value: '0 0 * * * *' },
  { label: '2시간마다', value: '0 0 */2 * * *' },
  { label: '3시간마다', value: '0 0 */3 * * *' },
  { label: '4시간마다', value: '0 0 */4 * * *' },
  { label: '6시간마다', value: '0 0 */6 * * *' },
  { label: '8시간마다', value: '0 0 */8 * * *' },
  { label: '12시간마다', value: '0 0 */12 * * *' },
  { label: '1일 1회 (자정)', value: '0 0 0 * * *' },
  { label: '1일 1회 (새벽 2시)', value: '0 0 2 * * *' },
];

function circuitBadge(state: string) {
  if (state === 'CLOSED') return 'bg-green-900 text-green-300';
  if (state === 'OPEN') return 'bg-red-900 text-red-300';
  return 'bg-yellow-900 text-yellow-300';
}

function jobBadge(status: string | null) {
  if (!status) return 'bg-gray-800 text-gray-500';
  if (status === 'completed') return 'bg-green-900 text-green-300';
  if (status === 'failed' || status === 'dead') return 'bg-red-900 text-red-300';
  if (status === 'running') return 'bg-blue-900 text-blue-300';
  return 'bg-gray-800 text-gray-400';
}

function usageColor(usage: number) {
  const pct = (usage / 100000) * 100;
  if (pct >= 80) return 'text-red-400';
  if (pct >= 50) return 'text-yellow-400';
  return 'text-green-400';
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [stores, setStores] = useState<StoreStatus[]>([]);
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [schedules, setSchedules] = useState<ScheduleConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('gpu');
  const [activeTab, setActiveTab] = useState<'stores' | 'schedule' | 'jobs'>('stores');
  const [toast, setToast] = useState('');

  // 스케줄 편집 상태
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editCron, setEditCron] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Naver 예상 사용량용 리스팅 수 (직접 입력)
  const [naverListingCount, setNaverListingCount] = useState(500);

  useEffect(() => {
    const stored = localStorage.getItem('admin_key') ?? '';
    setSavedKey(stored);
    setAdminKey(stored);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchStatus = useCallback(async (key: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/status`, {
        headers: { 'x-admin-key': key },
      });
      if (res.status === 401) throw new Error('어드민 키가 올바르지 않습니다');
      if (!res.ok) throw new Error('서버 오류');
      setStores(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류 발생');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJobs = useCallback(async (key: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/jobs`, { headers: { 'x-admin-key': key } });
      if (res.ok) setJobs(await res.json());
    } catch {}
  }, []);

  const fetchSchedules = useCallback(async (key: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/schedules`, { headers: { 'x-admin-key': key } });
      if (res.ok) setSchedules(await res.json());
    } catch {}
  }, []);

  const handleLogin = () => {
    localStorage.setItem('admin_key', adminKey);
    setSavedKey(adminKey);
    fetchStatus(adminKey);
    fetchJobs(adminKey);
    fetchSchedules(adminKey);
  };

  useEffect(() => {
    if (!savedKey) return;
    fetchStatus(savedKey);
    fetchJobs(savedKey);
    fetchSchedules(savedKey);
    const id = setInterval(() => {
      fetchStatus(savedKey);
      fetchJobs(savedKey);
    }, 30_000);
    return () => clearInterval(id);
  }, [savedKey, fetchStatus, fetchJobs, fetchSchedules]);

  const toggleStore = async (storeId: string, current: boolean) => {
    setTogglingId(storeId);
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/stores/${storeId}/toggle`, {
        method: 'PATCH',
        headers: { 'x-admin-key': savedKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error();
      setStores(prev => prev.map(s => s.storeId === storeId ? { ...s, isActive: !current } : s));
      showToast(`${!current ? '활성화' : '비활성화'} 완료`);
    } catch { showToast('오류 발생'); }
    finally { setTogglingId(null); }
  };

  const triggerStore = async (storeId: string, storeName: string) => {
    setTriggeringId(storeId);
    try {
      await fetch(`${API_BASE}/admin/crawler/trigger/store`, {
        method: 'POST',
        headers: { 'x-admin-key': savedKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });
      showToast(`${storeName} 크롤링 시작`);
    } catch { showToast('크롤링 시작 실패'); }
    finally { setTriggeringId(null); }
  };

  const triggerDiscovery = async (storeId: string, storeName: string) => {
    setTriggeringId(`${storeId}-discovery`);
    try {
      await fetch(`${API_BASE}/admin/crawler/trigger/discovery`, {
        method: 'POST',
        headers: { 'x-admin-key': savedKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, categorySlug: selectedCategory }),
      });
      showToast(`${storeName} [${selectedCategory}] Discovery 시작`);
    } catch { showToast('Discovery 시작 실패'); }
    finally { setTriggeringId(null); }
  };

  const resetCircuit = async (storeId: string, storeName: string) => {
    setResettingId(storeId);
    try {
      await fetch(`${API_BASE}/admin/crawler/circuit/${storeId}/reset`, {
        method: 'POST', headers: { 'x-admin-key': savedKey },
      });
      setStores(prev => prev.map(s => s.storeId === storeId ? { ...s, circuitState: 'CLOSED' } : s));
      showToast(`${storeName} 서킷브레이커 리셋`);
    } catch { showToast('리셋 실패'); }
    finally { setResettingId(null); }
  };

  const triggerAll = async () => {
    try {
      await fetch(`${API_BASE}/admin/crawler/trigger/all`, {
        method: 'POST', headers: { 'x-admin-key': savedKey },
      });
      showToast('전체 크롤링 시작');
    } catch { showToast('전체 크롤링 시작 실패'); }
  };

  const saveSchedule = async (key: string) => {
    setSavingSchedule(true);
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/schedules`, {
        method: 'PATCH',
        headers: { 'x-admin-key': savedKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, cronExpr: editCron }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? '저장 실패');
      }
      const updated = await res.json() as ScheduleConfig & { message: string };
      setSchedules(prev => prev.map(s => s.key === key ? { ...s, cronExpr: updated.cronExpr, updatedAt: updated.updatedAt } : s));
      setEditingKey(null);
      showToast('스케줄 저장 완료');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSavingSchedule(false);
    }
  };

  const resetScheduleToDefault = async (key: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/schedules/${encodeURIComponent(key)}/reset`, {
        method: 'POST', headers: { 'x-admin-key': savedKey },
      });
      if (!res.ok) throw new Error();
      const updated = await res.json() as ScheduleConfig & { message: string };
      setSchedules(prev => prev.map(s => s.key === key ? { ...s, cronExpr: updated.cronExpr, updatedAt: null } : s));
      if (editingKey === key) setEditingKey(null);
      showToast('기본값으로 리셋');
    } catch { showToast('리셋 실패'); }
  };

  const naverUsage = calcNaverUsage(schedules, naverListingCount);
  const usagePct = Math.min(100, Math.round((naverUsage.total / 100000) * 100));

  // ─── 로그인 화면 ─────────────────────────────────────────────────────────
  if (!savedKey) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-white">관리자 인증</h1>
          <p className="text-sm text-gray-400">Admin Key를 입력하세요</p>
          <input
            type="password"
            value={adminKey}
            onChange={e => setAdminKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="x-admin-key"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={handleLogin} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
            로그인
          </button>
        </div>
      </div>
    );
  }

  // ─── 메인 화면 ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">크롤러 관리</h1>
          <p className="text-sm text-gray-400 mt-1">스토어 활성화 및 크롤링 제어</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={triggerAll} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium transition-colors">
            전체 크롤링
          </button>
          <button onClick={() => { fetchStatus(savedKey); fetchJobs(savedKey); fetchSchedules(savedKey); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors">
            새로고침
          </button>
          <button onClick={() => { localStorage.removeItem('admin_key'); setSavedKey(''); setAdminKey(''); }} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-lg transition-colors">
            로그아웃
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-lg w-fit">
        {(['stores', 'schedule', 'jobs'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === tab ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
            {tab === 'stores' ? `스토어 (${stores.length})` : tab === 'schedule' ? '크롤링 주기' : '작업 로그'}
          </button>
        ))}
      </div>

      {loading && <div className="text-gray-400 text-sm animate-pulse">불러오는 중...</div>}

      {/* ── 스토어 탭 ── */}
      {activeTab === 'stores' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-xl p-4">
            <span className="text-sm text-gray-400 shrink-0">Discovery 카테고리:</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {stores.map(store => (
            <div key={store.storeId} className={`bg-gray-900 border rounded-xl p-5 transition-colors ${store.isActive ? 'border-gray-700' : 'border-gray-800 opacity-60'}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <button onClick={() => toggleStore(store.storeId, store.isActive)} disabled={togglingId === store.storeId}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${store.isActive ? 'bg-indigo-600' : 'bg-gray-700'} ${togglingId === store.storeId ? 'opacity-50' : ''}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${store.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{store.storeName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${circuitBadge(store.circuitState)}`}>{store.circuitState}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${jobBadge(store.lastJobStatus)}`}>{store.lastJobStatus ?? '기록 없음'}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {store.lastJobAt ? `마지막 작업: ${new Date(store.lastJobAt).toLocaleString('ko-KR')}` : '크롤링 기록 없음'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {store.circuitState === 'OPEN' && (
                    <button onClick={() => resetCircuit(store.storeId, store.storeName)} disabled={resettingId === store.storeId}
                      className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-300 text-xs rounded-lg font-medium transition-colors disabled:opacity-50">
                      서킷 리셋
                    </button>
                  )}
                  <button onClick={() => triggerDiscovery(store.storeId, store.storeName)} disabled={!store.isActive || triggeringId === `${store.storeId}-discovery`}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded-lg font-medium transition-colors disabled:opacity-40">
                    {triggeringId === `${store.storeId}-discovery` ? '...' : `Discovery [${selectedCategory}]`}
                  </button>
                  <button onClick={() => triggerStore(store.storeId, store.storeName)} disabled={!store.isActive || triggeringId === store.storeId}
                    className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-40">
                    {triggeringId === store.storeId ? '...' : '가격 새로고침'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 스케줄 탭 ── */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">

          {/* Naver API 사용량 예측 */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">네이버쇼핑 API 일일 사용량 예측</h2>
              <span className="text-xs text-gray-500">무료 한도: 100,000건/일</span>
            </div>

            {/* 사용량 바 */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">예상 사용량</span>
                <span className={`font-mono font-semibold ${usageColor(naverUsage.total)}`}>
                  {naverUsage.total.toLocaleString()} / 100,000건 ({usagePct}%)
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${usagePct >= 80 ? 'bg-red-500' : usagePct >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>

            {/* 세부 내역 */}
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-gray-400 text-xs mb-1">총 크론 실행</div>
                <div className="text-white font-semibold">{naverUsage.totalRuns}회/일</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-gray-400 text-xs mb-1">Discovery 호출</div>
                <div className="text-white font-semibold">{naverUsage.discoveryCallsPerDay.toLocaleString()}건</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-gray-400 text-xs mb-1">가격갱신 호출</div>
                <div className="text-white font-semibold">{naverUsage.refreshCallsPerDay.toLocaleString()}건</div>
              </div>
            </div>

            {/* 리스팅 수 조절 */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400 shrink-0">네이버 리스팅 수 (예측용):</label>
              <input
                type="number"
                min={0}
                max={10000}
                step={100}
                value={naverListingCount}
                onChange={e => setNaverListingCount(Number(e.target.value))}
                className="w-28 bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-gray-500">개</span>
            </div>
          </div>

          {/* 스케줄 목록 */}
          <div className="space-y-3">
            {schedules.map(schedule => (
              <div key={schedule.key} className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{schedule.label}</span>
                      {schedule.updatedAt && (
                        <span className="text-xs text-indigo-400 bg-indigo-900/50 px-2 py-0.5 rounded-full">수정됨</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{schedule.description}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {schedule.updatedAt && (
                      <button onClick={() => resetScheduleToDefault(schedule.key)}
                        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
                        기본값
                      </button>
                    )}
                    <button
                      onClick={() => { setEditingKey(editingKey === schedule.key ? null : schedule.key); setEditCron(schedule.cronExpr); }}
                      className="px-3 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg transition-colors">
                      {editingKey === schedule.key ? '취소' : '수정'}
                    </button>
                  </div>
                </div>

                {/* 현재 설정 표시 */}
                {editingKey !== schedule.key && (
                  <div className="flex items-center gap-3">
                    <code className="text-sm font-mono text-indigo-300 bg-gray-800 px-3 py-1.5 rounded-lg">
                      {schedule.cronExpr}
                    </code>
                    <span className="text-xs text-gray-500">
                      ≈ {estimateDailyRuns(schedule.cronExpr)}회/일
                    </span>
                    {schedule.updatedAt && (
                      <span className="text-xs text-gray-600">
                        {new Date(schedule.updatedAt).toLocaleString('ko-KR')} 변경
                      </span>
                    )}
                  </div>
                )}

                {/* 편집 폼 */}
                {editingKey === schedule.key && (
                  <div className="space-y-3 border-t border-gray-800 pt-3">
                    {/* 프리셋 */}
                    <div className="flex flex-wrap gap-2">
                      {CRON_PRESETS.map(p => (
                        <button key={p.value} onClick={() => setEditCron(p.value)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${editCron === p.value ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* 직접 입력 */}
                    <div className="flex items-center gap-3">
                      <input
                        value={editCron}
                        onChange={e => setEditCron(e.target.value)}
                        placeholder="cron 표현식 (예: 0 0 */3 * * *)"
                        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-xs text-gray-500 shrink-0">≈ {estimateDailyRuns(editCron)}회/일</span>
                      <button onClick={() => saveSchedule(schedule.key)} disabled={savingSchedule || !editCron}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50">
                        {savingSchedule ? '저장 중...' : '저장'}
                      </button>
                    </div>

                    <p className="text-xs text-gray-600">
                      형식: 초 분 시 일 월 요일 (6자리) 또는 분 시 일 월 요일 (5자리)
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 작업 로그 탭 ── */}
      {activeTab === 'jobs' && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left">
                  <th className="px-4 py-3 text-gray-400 font-medium">시간</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">스토어</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">상태</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">메타데이터</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => {
                  const store = stores.find(s => s.storeId === job.storeId);
                  return (
                    <tr key={job.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{new Date(job.createdAt).toLocaleString('ko-KR')}</td>
                      <td className="px-4 py-3 text-white">{store?.storeName ?? job.storeId.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${jobBadge(job.status)}`}>{job.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono max-w-xs truncate">{JSON.stringify(job.metadata)}</td>
                    </tr>
                  );
                })}
                {jobs.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">작업 기록이 없습니다</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-800 border border-gray-600 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
