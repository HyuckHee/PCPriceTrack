const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/** 리프레시 토큰으로 새 액세스 토큰 발급. 실패하면 null 반환 */
async function tryRefresh(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem('refresh_token');
  const userId = localStorage.getItem('user_id');
  if (!refreshToken || !userId) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { accessToken: string; refreshToken: string };
    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('refresh_token', data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options?: RequestInit, retry = true): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  // 401 → 리프레시 시도 후 재요청
  if (res.status === 401 && retry && typeof window !== 'undefined') {
    const newToken = await tryRefresh();
    if (newToken) {
      return request<T>(
        path,
        { ...options, headers: { ...options?.headers, Authorization: `Bearer ${newToken}` } },
        false, // 재시도는 1회만
      );
    }
    // 리프레시 실패 → 토큰 전체 제거 후 만료 이벤트 발생
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw Object.assign(new Error('세션이 만료되었습니다. 다시 로그인해주세요.'), { status: 401 });
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw Object.assign(
      new Error((error as { message?: string }).message ?? 'Request failed'),
      { status: res.status },
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  delete: <T>(path: string, token?: string) =>
    request<T>(path, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
};
