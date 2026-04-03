'use client';

import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const CATEGORIES = ['gpu', 'cpu', 'ram', 'ssd', 'motherboard', 'psu', 'case', 'cooler'];

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

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [stores, setStores] = useState<StoreStatus[]>([]);
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('gpu');
  const [activeTab, setActiveTab] = useState<'stores' | 'jobs'>('stores');
  const [toast, setToast] = useState('');

  // localStorage에서 키 복원
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
      const data = await res.json();
      setStores(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류 발생');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJobs = useCallback(async (key: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/jobs`, {
        headers: { 'x-admin-key': key },
      });
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data);
    } catch {}
  }, []);

  const handleLogin = () => {
    localStorage.setItem('admin_key', adminKey);
    setSavedKey(adminKey);
    fetchStatus(adminKey);
    fetchJobs(adminKey);
  };

  // 자동 새로고침 (30초)
  useEffect(() => {
    if (!savedKey) return;
    fetchStatus(savedKey);
    fetchJobs(savedKey);
    const id = setInterval(() => {
      fetchStatus(savedKey);
      fetchJobs(savedKey);
    }, 30_000);
    return () => clearInterval(id);
  }, [savedKey, fetchStatus, fetchJobs]);

  const toggleStore = async (storeId: string, current: boolean) => {
    setTogglingId(storeId);
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/stores/${storeId}/toggle`, {
        method: 'PATCH',
        headers: { 'x-admin-key': savedKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error('토글 실패');
      setStores(prev =>
        prev.map(s => s.storeId === storeId ? { ...s, isActive: !current } : s),
      );
      showToast(`${!current ? '활성화' : '비활성화'} 완료`);
    } catch {
      showToast('오류 발생');
    } finally {
      setTogglingId(null);
    }
  };

  const triggerStore = async (storeId: string, storeName: string) => {
    setTriggeringId(storeId);
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/trigger/store`, {
        method: 'POST',
        headers: { 'x-admin-key': savedKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });
      if (!res.ok) throw new Error();
      showToast(`${storeName} 크롤링 시작`);
    } catch {
      showToast('크롤링 시작 실패');
    } finally {
      setTriggeringId(null);
    }
  };

  const triggerDiscovery = async (storeId: string, storeName: string) => {
    setTriggeringId(`${storeId}-discovery`);
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/trigger/discovery`, {
        method: 'POST',
        headers: { 'x-admin-key': savedKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, categorySlug: selectedCategory }),
      });
      if (!res.ok) throw new Error();
      showToast(`${storeName} [${selectedCategory}] Discovery 시작`);
    } catch {
      showToast('Discovery 시작 실패');
    } finally {
      setTriggeringId(null);
    }
  };

  const resetCircuit = async (storeId: string, storeName: string) => {
    setResettingId(storeId);
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/circuit/${storeId}/reset`, {
        method: 'POST',
        headers: { 'x-admin-key': savedKey },
      });
      if (!res.ok) throw new Error();
      setStores(prev =>
        prev.map(s => s.storeId === storeId ? { ...s, circuitState: 'CLOSED' } : s),
      );
      showToast(`${storeName} 서킷브레이커 리셋`);
    } catch {
      showToast('리셋 실패');
    } finally {
      setResettingId(null);
    }
  };

  const triggerAll = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/crawler/trigger/all`, {
        method: 'POST',
        headers: { 'x-admin-key': savedKey },
      });
      if (!res.ok) throw new Error();
      showToast('전체 크롤링 시작');
    } catch {
      showToast('전체 크롤링 시작 실패');
    }
  };

  // 로그인 화면
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
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">크롤러 관리</h1>
          <p className="text-sm text-gray-400 mt-1">스토어 활성화 및 크롤링 제어</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={triggerAll}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium transition-colors"
          >
            전체 크롤링
          </button>
          <button
            onClick={() => { fetchStatus(savedKey); fetchJobs(savedKey); }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            새로고침
          </button>
          <button
            onClick={() => { localStorage.removeItem('admin_key'); setSavedKey(''); setAdminKey(''); }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-lg transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('stores')}
          className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === 'stores' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          스토어 ({stores.length})
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === 'jobs' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          작업 로그
        </button>
      </div>

      {loading && (
        <div className="text-gray-400 text-sm animate-pulse">불러오는 중...</div>
      )}

      {/* 스토어 탭 */}
      {activeTab === 'stores' && (
        <div className="space-y-3">
          {/* Discovery 카테고리 선택 */}
          <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-xl p-4">
            <span className="text-sm text-gray-400 shrink-0">Discovery 카테고리:</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* 스토어 목록 */}
          {stores.map(store => (
            <div
              key={store.storeId}
              className={`bg-gray-900 border rounded-xl p-5 transition-colors ${store.isActive ? 'border-gray-700' : 'border-gray-800 opacity-60'}`}
            >
              <div className="flex items-center justify-between gap-4">
                {/* 스토어 정보 */}
                <div className="flex items-center gap-4 min-w-0">
                  {/* Toggle 스위치 */}
                  <button
                    onClick={() => toggleStore(store.storeId, store.isActive)}
                    disabled={togglingId === store.storeId}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${store.isActive ? 'bg-indigo-600' : 'bg-gray-700'} ${togglingId === store.storeId ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${store.isActive ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{store.storeName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${circuitBadge(store.circuitState)}`}>
                        {store.circuitState}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${jobBadge(store.lastJobStatus)}`}>
                        {store.lastJobStatus ?? '기록 없음'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {store.lastJobAt
                        ? `마지막 작업: ${new Date(store.lastJobAt).toLocaleString('ko-KR')}`
                        : '크롤링 기록 없음'}
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-2 shrink-0">
                  {store.circuitState === 'OPEN' && (
                    <button
                      onClick={() => resetCircuit(store.storeId, store.storeName)}
                      disabled={resettingId === store.storeId}
                      className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-300 text-xs rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      서킷 리셋
                    </button>
                  )}
                  <button
                    onClick={() => triggerDiscovery(store.storeId, store.storeName)}
                    disabled={!store.isActive || triggeringId === `${store.storeId}-discovery`}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded-lg font-medium transition-colors disabled:opacity-40"
                  >
                    {triggeringId === `${store.storeId}-discovery` ? '...' : `Discovery [${selectedCategory}]`}
                  </button>
                  <button
                    onClick={() => triggerStore(store.storeId, store.storeName)}
                    disabled={!store.isActive || triggeringId === store.storeId}
                    className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-40"
                  >
                    {triggeringId === store.storeId ? '...' : '가격 새로고침'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 작업 로그 탭 */}
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
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {new Date(job.createdAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-white">
                        {store?.storeName ?? job.storeId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${jobBadge(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono max-w-xs truncate">
                        {JSON.stringify(job.metadata)}
                      </td>
                    </tr>
                  );
                })}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      작업 기록이 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 토스트 알림 */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-800 border border-gray-600 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50 animate-in fade-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}
    </div>
  );
}
