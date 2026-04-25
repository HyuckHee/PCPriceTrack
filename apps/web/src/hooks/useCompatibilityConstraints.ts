import { useMemo } from 'react';
import type { BuildComponent } from '@/lib/data';

export interface CompatibilityConstraint {
  specKey: string;
  operator: 'eq' | 'in' | 'contains' | 'lte' | 'gte';
  value: string | number | string[];
  source: string;
  rule: string;
}

interface ConstraintResult {
  constraints: CompatibilityConstraint[];
  specsFilter: Record<string, Record<string, unknown>>;
  activeSummary: string[];
}

// 카테고리 코드 → 사람이 읽을 수 있는 한국어 레이블
const CAT_LABEL: Record<string, string> = {
  cpu: 'CPU', gpu: 'GPU', motherboard: '메인보드', ram: 'RAM',
  psu: 'PSU', case: '케이스', cooler: '쿨러', ssd: 'SSD',
};

/**
 * 순수 함수: 빌더 부품 목록 + 대상 카테고리 → 호환성 제약 조건 계산.
 * React에 의존하지 않아 단위 테스트가 용이하다.
 */
export function computeConstraints(
  targetCategory: string,
  components: (BuildComponent | null)[],
): ConstraintResult {
  const constraints: CompatibilityConstraint[] = [];
  // null 제거 후 실제 부품만 추출
  const parts = components.filter(Boolean) as BuildComponent[];

  for (const part of parts) {
    const specs = part.specs;
    if (!specs || Object.keys(specs).length === 0) continue;
    const srcLabel = CAT_LABEL[part.category] ?? part.category;

    // ── CPU → 메인보드: 소켓 + 지원 RAM 타입 ─────────────────────────────────
    if (part.category === 'cpu' && targetCategory === 'motherboard') {
      if (specs.socket) {
        constraints.push({
          specKey: 'socket', operator: 'eq', value: specs.socket as string,
          source: `${srcLabel}: ${specs.socket}`, rule: 'cpu-mobo-socket',
        });
      }
      if (Array.isArray(specs.supportedRam) && specs.supportedRam.length > 0) {
        constraints.push({
          specKey: 'ramType', operator: 'in', value: specs.supportedRam as string[],
          source: `${srcLabel}: ${(specs.supportedRam as string[]).join('/')}`, rule: 'cpu-mobo-ram-type',
        });
      }
    }

    // ── CPU → 쿨러: 소켓 호환 여부 ──────────────────────────────────────────
    if (part.category === 'cpu' && targetCategory === 'cooler') {
      if (specs.socket) {
        constraints.push({
          specKey: 'supportedSockets', operator: 'contains', value: specs.socket as string,
          source: `${srcLabel}: ${specs.socket}`, rule: 'cooler-cpu-socket',
        });
      }
    }

    // ── 메인보드 → CPU: 소켓 일치 ────────────────────────────────────────────
    if (part.category === 'motherboard' && targetCategory === 'cpu') {
      if (specs.socket) {
        constraints.push({
          specKey: 'socket', operator: 'eq', value: specs.socket as string,
          source: `${srcLabel}: ${specs.socket}`, rule: 'cpu-mobo-socket',
        });
      }
    }

    // ── 메인보드 → RAM: 메모리 타입 일치 ─────────────────────────────────────
    if (part.category === 'motherboard' && targetCategory === 'ram') {
      if (specs.ramType) {
        constraints.push({
          specKey: 'type', operator: 'eq', value: specs.ramType as string,
          source: `${srcLabel}: ${specs.ramType}`, rule: 'ram-mobo-type',
        });
      }
    }

    // ── 메인보드 → 케이스: 폼팩터 호환 ──────────────────────────────────────
    if (part.category === 'motherboard' && targetCategory === 'case') {
      if (specs.formFactor) {
        constraints.push({
          specKey: 'supportedFormFactors', operator: 'contains', value: specs.formFactor as string,
          source: `${srcLabel}: ${specs.formFactor}`, rule: 'mobo-case-formfactor',
        });
      }
    }

    // ── 메인보드 → 쿨러: 소켓 호환 ──────────────────────────────────────────
    if (part.category === 'motherboard' && targetCategory === 'cooler') {
      if (specs.socket) {
        constraints.push({
          specKey: 'supportedSockets', operator: 'contains', value: specs.socket as string,
          source: `${srcLabel}: ${specs.socket}`, rule: 'cooler-mobo-socket',
        });
      }
    }

    // ── GPU → 케이스: GPU 길이 ≤ 케이스 최대 GPU 길이 ────────────────────────
    if (part.category === 'gpu' && targetCategory === 'case') {
      if (specs.lengthMm) {
        constraints.push({
          specKey: 'maxGpuLengthMm', operator: 'gte', value: specs.lengthMm as number,
          source: `${srcLabel}: ${specs.lengthMm}mm`, rule: 'gpu-case-length',
        });
      }
    }

    // ── 케이스 → 메인보드: 지원 폼팩터 목록 ─────────────────────────────────
    if (part.category === 'case' && targetCategory === 'motherboard') {
      if (Array.isArray(specs.supportedFormFactors) && specs.supportedFormFactors.length > 0) {
        constraints.push({
          specKey: 'formFactor', operator: 'in', value: specs.supportedFormFactors as string[],
          source: `${srcLabel}: ${(specs.supportedFormFactors as string[]).join('/')}`, rule: 'mobo-case-formfactor',
        });
      }
    }

    // ── 케이스 → PSU: PSU 폼팩터 일치 ───────────────────────────────────────
    if (part.category === 'case' && targetCategory === 'psu') {
      if (specs.psuFormFactor) {
        constraints.push({
          specKey: 'formFactor', operator: 'eq', value: specs.psuFormFactor as string,
          source: `${srcLabel}: ${specs.psuFormFactor}`, rule: 'psu-case-formfactor',
        });
      }
    }

    // ── 케이스 → GPU: GPU 길이 ≤ 케이스 허용 최대치 ─────────────────────────
    if (part.category === 'case' && targetCategory === 'gpu') {
      if (specs.maxGpuLengthMm) {
        constraints.push({
          specKey: 'lengthMm', operator: 'lte', value: specs.maxGpuLengthMm as number,
          source: `${srcLabel}: 최대 ${specs.maxGpuLengthMm}mm`, rule: 'gpu-case-length',
        });
      }
    }

    // ── 케이스 → 쿨러: 쿨러 높이 ≤ 케이스 허용 최대치 ──────────────────────
    if (part.category === 'case' && targetCategory === 'cooler') {
      if (specs.maxCoolerHeightMm) {
        constraints.push({
          specKey: 'heightMm', operator: 'lte', value: specs.maxCoolerHeightMm as number,
          source: `${srcLabel}: 최대 ${specs.maxCoolerHeightMm}mm`, rule: 'cooler-case-height',
        });
      }
    }
  }

  // 동일한 (specKey, operator, value) 조합의 중복 제거
  const seen = new Set<string>();
  const deduplicated = constraints.filter((c) => {
    const key = `${c.specKey}:${c.operator}:${JSON.stringify(c.value)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // API 파라미터 형식으로 변환: { specKey: { operator: value } }
  const specsFilter: Record<string, Record<string, unknown>> = {};
  for (const c of deduplicated) {
    specsFilter[c.specKey] = { [c.operator]: c.value };
  }

  // 사람이 읽을 수 있는 요약 문자열 목록
  const activeSummary = deduplicated.map((c) => c.source);

  return { constraints: deduplicated, specsFilter, activeSummary };
}

/**
 * React 훅: 빌더 컨텍스트에서 부품을 읽어 호환성 제약 반환.
 * computeConstraints를 useMemo로 감싸 불필요한 재계산을 방지한다.
 */
export function useCompatibilityConstraints(
  targetCategory: string,
  components: (BuildComponent | null)[],
): ConstraintResult {
  return useMemo(
    () => computeConstraints(targetCategory, components),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targetCategory, components],
  );
}
