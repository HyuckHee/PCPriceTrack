'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function AuthNav() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [clearKakao, setClearKakao] = useState(false);

  function handleLogoutConfirm() {
    logout();
    setShowModal(false);
    if (clearKakao) {
      window.location.href = `${API_BASE}/auth/kakao/logout`;
    } else {
      router.push('/');
    }
  }

  if (isLoading) return <span className="text-gray-600 text-sm">...</span>;

  if (user) {
    return (
      <>
        <div className="flex items-center gap-3">
          <span className="text-gray-300 text-sm">{user.name ?? user.email}</span>
          <button
            onClick={() => { setClearKakao(false); setShowModal(true); }}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            로그아웃
          </button>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 배경 오버레이 */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />

            {/* 모달 카드 */}
            <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6 w-80 flex flex-col gap-5">
              <h2 className="text-white font-semibold text-base">로그아웃 하시겠습니까?</h2>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={clearKakao}
                  onChange={(e) => setClearKakao(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-yellow-400 cursor-pointer"
                />
                <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors leading-relaxed">
                  카카오 로그인 정보를 완전히 제거합니다
                  <br />
                  <span className="text-xs text-gray-600">다른 카카오 계정으로 로그인할 때 선택하세요</span>
                </span>
              </label>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-sm transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <Link href="/login" className="hover:text-white transition-colors">
      로그인
    </Link>
  );
}
