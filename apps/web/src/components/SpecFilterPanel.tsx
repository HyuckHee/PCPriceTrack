'use client';

import { useQueryStates, parseAsString } from 'nuqs';
import { useTransition } from 'react';
import type { FacetsResponse } from '@/lib/data';

// 스펙 한국어 라벨
const SPEC_LABELS: Record<string, string> = {
  cores: '코어 수', threads: '스레드', socket: '소켓', generation: '세대',
  vram: 'VRAM (GB)', chipset: '칩셋', bus_width: '버스 폭', capacity: '용량 (GB)',
  ddr: 'DDR', speed: '속도', wattage: '와트', efficiency: '효율', type: '타입',
};

interface Props {
  facets: FacetsResponse | null;
  categoryId: string;
}

export function SpecFilterPanel({ facets, categoryId }: Props) {
  const [isPending, startTransition] = useTransition();

  const [params, setParams] = useQueryStates(
    {
      specs: parseAsString.withDefault(''),
      page:  parseAsString.withDefault('1'),
    },
    { shallow: false },
  );

  if (!facets || !categoryId || Object.keys(facets.specs).length === 0) return null;

  const specsObj: Record<string, unknown> = params.specs
    ? (() => { try { return JSON.parse(params.specs); } catch { return {}; } })()
    : {};

  const hasSpecs = Object.keys(specsObj).length > 0;

  const apply = (values: Parameters<typeof setParams>[0]) =>
    startTransition(() => { void setParams(values); });

  const updateSpec = (key: string, value: unknown) => {
    const next = { ...specsObj, [key]: value };
    if (value === '' || value === null || value === undefined) delete next[key];
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, string>;
      if (!obj.min && !obj.max) delete next[key];
    }
    const str = Object.keys(next).length > 0 ? JSON.stringify(next) : '';
    apply({ specs: str, page: '1' });
  };

  const toggleSpecEnum = (specKey: string, val: string) => {
    const current = (specsObj[specKey] as string[] | undefined) ?? [];
    const next = current.includes(val)
      ? current.filter((x) => x !== val)
      : [...current, val];
    updateSpec(specKey, next.length > 0 ? next : null);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden mb-3">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <span className="text-xs font-semibold text-gray-400">스펙 필터</span>
        {hasSpecs && (
          <button
            onClick={() => apply({ specs: '', page: '1' })}
            disabled={isPending}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            스펙 필터 초기화
          </button>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {Object.entries(facets.specs).map(([key, spec]) => {
          const label = SPEC_LABELS[key] ?? key;

          if (spec.type === 'range') {
            const rangeVal = (specsObj[key] as { min?: string; max?: string } | undefined) ?? {};
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="shrink-0 w-24 text-xs text-gray-400">{label}</span>
                <input
                  value={rangeVal.min ?? ''}
                  onChange={(e) => updateSpec(key, { ...rangeVal, min: e.target.value })}
                  placeholder={spec.min != null ? String(spec.min) : '최소'}
                  type="number"
                  className="w-20 bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500 placeholder-gray-600"
                />
                <span className="text-gray-500 text-xs">~</span>
                <input
                  value={rangeVal.max ?? ''}
                  onChange={(e) => updateSpec(key, { ...rangeVal, max: e.target.value })}
                  placeholder={spec.max != null ? String(spec.max) : '최대'}
                  type="number"
                  className="w-20 bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500 placeholder-gray-600"
                />
              </div>
            );
          }

          // enum 타입
          const selected = (specsObj[key] as string[] | undefined) ?? [];
          return (
            <div key={key} className="flex items-start gap-2">
              <span className="shrink-0 w-24 text-xs text-gray-400 pt-1">{label}</span>
              <div className="flex flex-wrap gap-1.5">
                {spec.values?.map((val) => {
                  const isActive = selected.includes(val);
                  return (
                    <button
                      key={val}
                      onClick={() => toggleSpecEnum(key, val)}
                      disabled={isPending}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                        isActive
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-gray-900 border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
