'use client';

import { useBuildEstimator } from '@/context/BuildEstimatorContext';
import { useCompatibilityConstraints } from '@/hooks/useCompatibilityConstraints';
import type { ProductListItem } from '@/lib/data';
import { ProductListRow } from './ProductListRow';

interface Props {
  products: ProductListItem[];
  categorySlug: string;
}

/**
 * 빌더 컨텍스트를 읽어 각 제품의 호환성 여부를 계산하고,
 * 비호환 제품에 사유를 표시하는 클라이언트 래퍼 컴포넌트.
 */
export function ProductListWithCompatibility({ products, categorySlug }: Props) {
  const { components } = useBuildEstimator();
  const { constraints } = useCompatibilityConstraints(categorySlug, components);

  /**
   * 제품 스펙과 현재 호환성 제약 조건을 비교해 비호환 사유를 반환.
   * 모두 통과하면 null 반환 (= 호환 가능).
   */
  function getIncompatibleReason(productSpecs: Record<string, unknown>): string | null {
    if (constraints.length === 0) return null;

    for (const c of constraints) {
      const val = productSpecs[c.specKey];
      if (val === undefined) continue;

      switch (c.operator) {
        case 'eq':
          if (String(val) !== String(c.value)) return `${val} — ${c.source}와 호환되지 않음`;
          break;
        case 'in':
          if (!(c.value as string[]).includes(String(val))) return `${val} — ${c.source}와 호환되지 않음`;
          break;
        case 'contains':
          if (!Array.isArray(val) || !val.includes(c.value)) return `${c.source}와 호환되지 않음`;
          break;
        case 'lte':
          if (Number(val) > Number(c.value)) return `${val} — ${c.source} 초과`;
          break;
        case 'gte':
          if (Number(val) < Number(c.value)) return `${val} — ${c.source} 미만`;
          break;
      }
    }

    return null;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {products.map((p) => (
        <ProductListRow
          key={p.id}
          p={p}
          incompatibleReason={getIncompatibleReason(p.specs ?? {})}
        />
      ))}
    </div>
  );
}
