'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function AuthNav() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    if (user?.provider === 'kakao') {
      window.location.href = `${API_BASE}/auth/kakao/logout`;
    } else {
      router.push('/');
    }
  }

  if (isLoading) return <span className="text-gray-600 text-sm">...</span>;

  if (user) {
    return (
      <div className="flex items-center gap-3">
        {(user.role === 'admin' || user.role === 'master') && (
          <Link href="/admin" className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium">
            관리
          </Link>
        )}
        <span className="text-gray-300 text-sm">{user.name ?? user.email}</span>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <Link href="/login" className="hover:text-white transition-colors">
      로그인
    </Link>
  );
}
