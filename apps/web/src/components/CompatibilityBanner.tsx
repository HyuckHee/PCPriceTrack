'use client';

import type { CompatibilityConstraint } from '@/hooks/useCompatibilityConstraints';

interface Props {
  constraints: CompatibilityConstraint[];
  activeSummary: string[];
  showIncompatible: boolean;
  onToggleIncompatible: (value: boolean) => void;
}

export function CompatibilityBanner({
  constraints,
  activeSummary,
  showIncompatible,
  onToggleIncompatible,
}: Props) {
  if (constraints.length === 0) return null;

  return (
    <div
      className={`border rounded-xl px-4 py-3 mb-3 ${
        showIncompatible
          ? 'bg-gradient-to-r from-gray-800 to-gray-800 border-yellow-500/25'
          : 'bg-gradient-to-r from-slate-800 to-slate-900 border-blue-500/25'
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold mb-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={showIncompatible ? 'text-yellow-400' : 'text-blue-400'}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span className={showIncompatible ? 'text-yellow-400' : 'text-blue-400'}>
          {showIncompatible ? '전체 제품 표시 중 (비호환 포함)' : '빌더 호환성 필터 적용 중'}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {activeSummary.map((tag) => (
          <span
            key={tag}
            className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-md text-xs font-medium"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-gray-400">비호환 제품도 보기</span>
        <button
          type="button"
          role="switch"
          aria-checked={showIncompatible}
          onClick={() => onToggleIncompatible(!showIncompatible)}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            showIncompatible ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              showIncompatible ? 'translate-x-4' : ''
            }`}
          />
        </button>
      </div>
    </div>
  );
}
