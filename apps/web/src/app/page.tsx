'use client';

import Link from 'next/link';
import { useBuildEstimator } from '@/context/BuildEstimatorContext';

export default function Home() {
  const { open: openEstimator } = useBuildEstimator();

  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold mb-4">PC 부품 최저가 비교</h1>
      <p className="text-gray-400 text-lg mb-8">
        GPU, CPU, RAM, SSD 가격을 국내외 쇼핑몰에서 한눈에 비교하세요.
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Link
          href="/products"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
        >
          상품 보기
        </Link>
        <Link
          href="/deals"
          className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
        >
          🔥 특가
        </Link>
        <button
          onClick={openEstimator}
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
        >
          🖥️ 견적짜기
        </button>
      </div>
    </div>
  );
}
