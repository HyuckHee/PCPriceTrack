'use client';

import { useBuildEstimator } from '@/context/BuildEstimatorContext';

export default function BuildEstimatorButton() {
  const { toggle } = useBuildEstimator();

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
      aria-label="조립 PC 견적 계산기 열기"
    >
      🖥️ 견적
    </button>
  );
}
