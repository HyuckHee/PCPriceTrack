'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AuthNav() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) return <span className="text-gray-600 text-sm">...</span>;

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-gray-300 text-sm">{user.name ?? user.email}</span>
        <button
          onClick={() => { logout(); router.push('/'); }}
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
