'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const CATEGORIES = ['gpu', 'cpu', 'ram', 'ssd', 'motherboard', 'psu', 'case', 'cooler'];

/** Naver API 일일 사용량 계산 */
const NAVER_KEYWORDS_PER_CATEGORY: Record<string, number> = {
  gpu: 9, cpu: 6, ram: 4, ssd: 4, motherboard: 4, psu: 3, case: 3, cooler: 3,
};

/** 스케줄 키별 Discovery 대상 카테고리 (빈 배열 = 전체) */
const SCHEDULE_CATEGORY_KEYWORDS: Record<string, string[]> = {
  'schedule.high_volatility': ['gpu', 'cpu'],
  'schedule.medium_volatility': ['ram', 'ssd'],
  'schedule.low_volatility': ['motherboard', 'psu', 'cooler', 'case'],
  'schedule.nightly': ['gpu', 'cpu', 'ram', 'ssd', 'motherboard', 'psu', 'cooler', 'case'],
};

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
  let discoveryCallsPerDay = 0;
  let totalRuns = 0;

  for (const s of schedules) {
    const runs = estimateDailyRuns(s.cronExpr);
    totalRuns += runs;
    const cats = SCHEDULE_CATEGORY_KEYWORDS[s.key] ?? [];
    const keywords = cats.reduce((sum, cat) => sum + (NAVER_KEYWORDS_PER_CATEGORY[cat] ?? 0), 0);
    discoveryCallsPerDay += runs * keywords;
  }

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

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  provider: string | null;
  isVerified: boolean;
  createdAt: string;
}

interface ScheduleConfig {
  key: string;
  label: string;
  cronExpr: string;
  description: string;
  updatedAt: string | null;
}

interface RuntimeInfo {
  environment: 'render' | 'local';
  serviceName: string;
  serviceUrl: string | null;
  redisMode: 'disabled' | 'local' | 'upstash';
  redisHost: string;
  nodeEnv: string;
  concurrency: number;
  uptimeSeconds: number;
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

type UserRole = 'user' | 'admin' | 'master';

export default function AdminPage() {
  const { user: authUser, token: authToken } = useAuth();
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
  const [runningSchedule, setRunningSchedule] = useState<string | null>(null);
  const [triggeringAll, setTriggeringAll] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('gpu');
  const [activeTab, setActiveTab] = useState<'stores' | 'schedule' | 'jobs' | 'users'>('stores');
  const [toast, setToast] = useState('');

  // 유저 관리 상태
  const [userList, setUserList] = useState<AdminUser[]>([]);
  const [userMeta, setUserMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userLoading, setUserLoading] = useState(false);
  const [togglingRole, setTogglingRole] = useState<string | null>(null);

  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);

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

  const fetchRuntime = useCallback(async (key: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/runtime`, { headers: { 'x-admin-key': key } });
      if (res.ok) setRuntimeInfo(await res.json());
    } catch {}
  }, []);

  const fetchUsers = useCallback(async (jwtToken: string, search: string, page: number) => {
    setUserLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) qs.set('search', search.trim());
      const res = await fetch(`${API_BASE}/admin/users?${qs}`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      if (res.ok) {
        const data = await res.json() as { data: AdminUser[]; meta: { total: number; page: number; totalPages: number } };
        setUserList(data.data);
        setUserMeta(data.meta);
      }
    } catch {}
    finally { setUserLoading(false); }
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/status`, {
        headers: { 'x-admin-key': adminKey },
      });
      if (res.status === 401) throw new Error('어드민 키가 올바르지 않습니다');
      if (!res.ok) throw new Error('서버 오류');
      const data = await res.json();
      // 검증 성공 후에만 저장 및 상태 전환
      localStorage.setItem('admin_key', adminKey);
      setSavedKey(adminKey);
      setStores(data);
      fetchJobs(adminKey);
      fetchSchedules(adminKey);
      fetchRuntime(adminKey);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류 발생');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!savedKey) return;
    fetchStatus(savedKey);
    fetchJobs(savedKey);
    fetchSchedules(savedKey);
    fetchRuntime(savedKey);
    const id = setInterval(() => {
      fetchStatus(savedKey);
      fetchJobs(savedKey);
    }, 30_000);
    return () => clearInterval(id);
  }, [savedKey, fetchStatus, fetchJobs, fetchSchedules, fetchRuntime]);

  useEffect(() => {
    if (!authToken || activeTab !== 'users') return;
    fetchUsers(authToken, userSearch, userPage);
  }, [authToken, activeTab, userPage, fetchUsers]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setTriggeringAll(true);
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/trigger/all`, {
        method: 'POST', headers: { 'x-admin-key': savedKey },
      });
      const data = await res.json().catch(() => ({})) as { enqueued?: number };
      showToast(`전체 크롤링 시작 (${data.enqueued ?? 0}개 스토어)`);
      setTimeout(() => { fetchJobs(savedKey); }, 2000);
    } catch { showToast('전체 크롤링 시작 실패'); }
    finally { setTriggeringAll(false); }
  };

  const runScheduleNow = async (key: string, label: string) => {
    setRunningSchedule(key);
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/schedules/${encodeURIComponent(key)}/run`, {
        method: 'POST', headers: { 'x-admin-key': savedKey },
      });
      const data = await res.json().catch(() => ({})) as { enqueued?: number };
      showToast(`[${label}] 즉시 실행 시작 (${data.enqueued ?? 0}개 스토어)`);
      setTimeout(() => { fetchJobs(savedKey); }, 2000);
    } catch { showToast('즉시 실행 실패'); }
    finally { setRunningSchedule(null); }
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

  const ROLE_LABELS: Record<UserRole, string> = { user: '일반 유저', admin: '관리자', master: '마스터' };

  const cycleRole = (current: UserRole): UserRole => {
    if (current === 'user') return 'admin';
    if (current === 'admin') return 'master';
    return 'user';
  };

  const toggleUserRole = async (user: AdminUser, targetRole: UserRole) => {
    if (!authToken) return;
    setTogglingRole(user.id);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole }),
      });
      if (res.status === 403) { showToast('권한이 없습니다 (master 전용)'); return; }
      if (!res.ok) throw new Error();
      setUserList(prev => prev.map(u => u.id === user.id ? { ...u, role: targetRole } : u));
      showToast(`${user.email} → ${ROLE_LABELS[targetRole]}로 변경`);
    } catch { showToast('역할 변경 실패'); }
    finally { setTogglingRole(null); }
  };

  const handleUserSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setUserPage(1);
    if (authToken) fetchUsers(authToken, userSearch, 1);
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
          <button onClick={triggerAll} disabled={triggeringAll} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-60">
            {triggeringAll ? '실행 중...' : '전체 즉시 실행'}
          </button>
          <button onClick={() => { fetchStatus(savedKey); fetchJobs(savedKey); fetchSchedules(savedKey); fetchRuntime(savedKey); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors">
            새로고침
          </button>
          <button onClick={() => { localStorage.removeItem('admin_key'); setSavedKey(''); setAdminKey(''); }} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-lg transition-colors">
            로그아웃
          </button>
        </div>
      </div>

      {/* 런타임 환경 배너 */}
      {runtimeInfo && (
        <div className="flex flex-wrap items-center gap-3 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-xs">
          <span className="text-gray-500 font-medium shrink-0">크롤링 실행 위치</span>
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold ${runtimeInfo.environment === 'render' ? 'bg-blue-900 text-blue-300' : 'bg-gray-800 text-gray-300'}`}>
            {runtimeInfo.environment === 'render' ? '☁ Render' : '🖥 로컬'}
            <span className="font-normal opacity-80">{runtimeInfo.serviceName}</span>
          </span>
          {runtimeInfo.serviceUrl && (
            <a href={runtimeInfo.serviceUrl} target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 truncate max-w-[200px]">
              {runtimeInfo.serviceUrl.replace('https://', '')}
            </a>
          )}
          <span className={`px-2.5 py-1 rounded-full font-medium ${
            runtimeInfo.redisMode === 'upstash' ? 'bg-purple-900 text-purple-300' :
            runtimeInfo.redisMode === 'local' ? 'bg-green-900 text-green-300' :
            'bg-gray-800 text-gray-500'
          }`}>
            Redis: {runtimeInfo.redisMode === 'disabled' ? '인메모리' : runtimeInfo.redisMode === 'upstash' ? `Upstash (${runtimeInfo.redisHost})` : `로컬 (${runtimeInfo.redisHost})`}
          </span>
          <span className={`px-2.5 py-1 rounded-full font-medium ${runtimeInfo.nodeEnv === 'production' ? 'bg-orange-900 text-orange-300' : 'bg-gray-800 text-gray-400'}`}>
            {runtimeInfo.nodeEnv}
          </span>
          <span className="text-gray-500">동시 처리: <span className="text-gray-300">{runtimeInfo.concurrency}</span></span>
          <span className="text-gray-600 ml-auto">
            업타임 {Math.floor(runtimeInfo.uptimeSeconds / 3600)}h {Math.floor((runtimeInfo.uptimeSeconds % 3600) / 60)}m
          </span>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-lg w-fit">
        {(['stores', 'schedule', 'jobs', 'users'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === tab ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
            {tab === 'stores' ? `스토어 (${stores.length})` : tab === 'schedule' ? '크롤링 주기' : tab === 'jobs' ? '작업 로그' : `유저 관리`}
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
                    <button
                      onClick={() => runScheduleNow(schedule.key, schedule.label)}
                      disabled={runningSchedule === schedule.key}
                      className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                      {runningSchedule === schedule.key ? '실행 중...' : '지금 실행'}
                    </button>
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

      {/* ── 유저 관리 탭 ── */}
      {activeTab === 'users' && (() => {
        const viewerRole = authUser?.role as UserRole | undefined;
        const canView = viewerRole === 'admin' || viewerRole === 'master';
        const canEdit = viewerRole === 'master';

        if (!authToken || !canView) {
          return (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <p className="text-gray-400 text-sm">
                {!authToken ? '유저 관리는 사이트 로그인이 필요합니다.' : '접근 권한이 없습니다. (admin 이상 필요)'}
              </p>
              {!authToken && (
                <a href="/login" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
                  로그인
                </a>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {/* 권한 안내 배너 */}
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${canEdit ? 'bg-indigo-900/40 border border-indigo-700 text-indigo-300' : 'bg-gray-800 border border-gray-700 text-gray-400'}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${canEdit ? 'bg-indigo-400' : 'bg-gray-500'}`} />
              {canEdit
                ? `마스터로 로그인 중 (${authUser?.email}) — 역할 변경 가능`
                : `관리자로 로그인 중 (${authUser?.email}) — 조회만 가능`}
            </div>

            {/* 검색 */}
            <form onSubmit={handleUserSearch} className="flex gap-2">
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="이메일 또는 이름으로 검색"
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
                검색
              </button>
              {userSearch && (
                <button type="button" onClick={() => { setUserSearch(''); setUserPage(1); if (authToken) fetchUsers(authToken, '', 1); }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors">
                  초기화
                </button>
              )}
            </form>

            {/* 총계 */}
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>총 {userMeta.total.toLocaleString()}명</span>
              {userLoading && <span className="animate-pulse">불러오는 중...</span>}
            </div>

            {/* 유저 목록 */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-left">
                    <th className="px-4 py-3 text-gray-400 font-medium">이메일</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">이름</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">공급자</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">역할</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">가입일</th>
                    {canEdit && <th className="px-4 py-3 text-gray-400 font-medium">역할 변경</th>}
                  </tr>
                </thead>
                <tbody>
                  {userList.map(user => {
                    const roleBadge: Record<UserRole, string> = {
                      user: 'bg-gray-800 text-gray-400',
                      admin: 'bg-indigo-900 text-indigo-300',
                      master: 'bg-yellow-900 text-yellow-300',
                    };
                    const next = cycleRole(user.role);
                    const nextLabel: Record<UserRole, string> = { user: '관리자로', admin: '마스터로', master: '유저로' };
                    const isSelf = authUser?.id === user.id;
                    return (
                      <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-white font-mono text-xs">{user.email}</td>
                        <td className="px-4 py-3 text-gray-300">{user.name ?? <span className="text-gray-600">-</span>}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{user.provider ?? 'email'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge[user.role]}`}>
                            {ROLE_LABELS[user.role]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        {canEdit && (
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleUserRole(user, next)}
                              disabled={togglingRole === user.id || isSelf}
                              title={isSelf ? '자신의 역할은 변경할 수 없습니다' : undefined}
                              className="px-3 py-1 text-xs rounded-lg font-medium transition-colors disabled:opacity-40 bg-gray-700 hover:bg-gray-600 text-gray-300"
                            >
                              {togglingRole === user.id ? '...' : `${nextLabel[user.role]} 변경`}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {userList.length === 0 && !userLoading && (
                    <tr><td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-gray-500">유저가 없습니다</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {userMeta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage <= 1}
                  className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg disabled:opacity-40 transition-colors">
                  이전
                </button>
                <span className="text-sm text-gray-400">{userPage} / {userMeta.totalPages}</span>
                <button onClick={() => setUserPage(p => Math.min(userMeta.totalPages, p + 1))} disabled={userPage >= userMeta.totalPages}
                  className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg disabled:opacity-40 transition-colors">
                  다음
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-800 border border-gray-600 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
