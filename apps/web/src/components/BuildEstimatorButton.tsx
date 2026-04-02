'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBuildEstimator } from '@/context/BuildEstimatorContext';

export default function BuildEstimatorButton() {
  const { toggle } = useBuildEstimator();
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);

  function handleClick() {
    const token = localStorage.getItem('token');
    if (!token) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    toggle();
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        aria-label="조립 PC 견적 계산기 열기"
      >
        🖥️ 견적
      </button>

      {showToast && (
        <div className="absolute right-0 top-10 z-50 flex items-center gap-2 whitespace-nowrap bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 shadow-xl text-sm animate-fade-in">
          <span className="text-yellow-400">🔒</span>
          <span className="text-gray-200">
            견적 기능은{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-blue-400 hover:underline font-medium"
            >
              로그인
            </button>{' '}
            후 이용 가능합니다.
          </span>
        </div>
      )}
    </div>
  );
}
