# 공통 호환성 필터 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 빌더에 선택된 부품 스펙 기반으로 제품 목록에서 호환 가능한 제품만 자동 필터링하는 공통 시스템 구현

**Architecture:** 프론트엔드 훅(`useCompatibilityConstraints`)이 빌더 컨텍스트의 부품 스펙을 읽어 현재 카테고리에 맞는 제약 조건을 계산. 이 제약을 기존 `specs` 쿼리 파라미터에 병합하여 API로 전달. API는 기존 WHERE 절 확장(`contains`, `in` 연산자 추가)으로 처리.

**Tech Stack:** React 19, Next.js 15 (App Router + nuqs), NestJS 10, PostgreSQL JSONB

**Spec:** `docs/superpowers/specs/2026-04-25-compatibility-filter-design.md`
**Mockup:** `docs/mockups/compatibility-filter-mockup.html`

---

## 파일 구조

| 동작 | 파일 | 역할 |
|---|---|---|
| Create | `apps/web/src/hooks/useCompatibilityConstraints.ts` | 빌더 부품 → 카테고리별 호환성 제약 계산 훅 |
| Create | `apps/web/src/hooks/useCompatibilityConstraints.test.ts` | 훅 단위 테스트 |
| Create | `apps/web/src/components/CompatibilityBanner.tsx` | 호환성 필터 배너 + 토글 UI |
| Modify | `apps/web/src/lib/data.ts:215-232` | `BuildComponent`에 `specs` 필드 추가 |
| Modify | `apps/web/src/context/BuildEstimatorContext.tsx` | 선택된 부품 목록을 Context로 노출 |
| Modify | `apps/web/src/components/BuildEstimatorPanel.tsx` | 부품 변경 시 Context 업데이트 |
| Modify | `apps/web/src/components/ProductFilters.tsx` | 호환성 제약을 specs 파라미터에 병합 |
| Modify | `apps/web/src/components/SpecFilterPanel.tsx` | 잠긴 필터 표시 + 비활성 enum 처리 |
| Modify | `apps/web/src/app/products/page.tsx` | 비호환 제품 표시를 위한 데이터 전달 |
| Modify | `apps/api/src/modules/products/products.service.ts:92-105` | specs 파싱에 `contains`, `in` 연산자 추가 |

---

### Task 1: API — specs 파싱에 `contains`, `in` 연산자 추가

`contains`(JSON 배열에 값 포함)와 `in`(여러 값 중 하나 일치) 연산자를 기존 specs 필터 로직에 추가.

**Files:**
- Modify: `apps/api/src/modules/products/products.service.ts:92-105`
- Test: `apps/api/src/modules/products/products.service.spec.ts` (신규)

- [ ] **Step 1: 테스트 파일 생성**

`apps/api/src/modules/products/products.service.spec.ts` 생성:

```typescript
import { ProductsService } from './products.service';

// specs 파싱 로직만 단위 테스트 — DB 호출은 모킹
describe('ProductsService specs filtering', () => {
  let service: ProductsService;
  let mockPool: { query: jest.Mock };
  let mockDb: Record<string, unknown>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };
    mockDb = {};
    service = new ProductsService(mockDb as any, mockPool as any);
  });

  it('eq 연산자: specs->>"key" = value 조건 생성', async () => {
    await service.list({ specs: JSON.stringify({ type: { eq: 'DDR5' } }) });
    const sql = mockPool.query.mock.calls[0][0] as string;
    expect(sql).toContain(`specs->>'type'`);
    expect(sql).toContain('=');
  });

  it('contains 연산자: specs->"key" @> 조건 생성', async () => {
    await service.list({
      specs: JSON.stringify({ supportedSockets: { contains: 'LGA1700' } }),
    });
    const sql = mockPool.query.mock.calls[0][0] as string;
    expect(sql).toContain(`specs->'supportedSockets'`);
    expect(sql).toContain('@>');
  });

  it('in 연산자: specs->>"key" IN (...) 조건 생성', async () => {
    await service.list({
      specs: JSON.stringify({ ramType: { in: ['DDR4', 'DDR5'] } }),
    });
    const sql = mockPool.query.mock.calls[0][0] as string;
    expect(sql).toContain(`specs->>'ramType'`);
    expect(sql).toContain('IN');
  });

  it('허용되지 않은 키는 무시', async () => {
    await service.list({
      specs: JSON.stringify({ hackerKey: { eq: 'evil' } }),
    });
    const sql = mockPool.query.mock.calls[0][0] as string;
    expect(sql).not.toContain('hackerKey');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `pnpm --filter api test -- --testPathPattern=products.service.spec`
Expected: `contains`와 `in` 테스트 FAIL (해당 연산자 미구현)

- [ ] **Step 3: products.service.ts에 `contains`, `in` 연산자 추가**

`apps/api/src/modules/products/products.service.ts`의 specs 파싱 블록(L92-105)을 수정. 기존 `gte`, `lte`, `eq` 뒤에 추가:

```typescript
    // 스펙 필터 (JSON 파싱)
    if (specs) {
      try {
        const parsed = JSON.parse(specs) as Record<string, Record<string, unknown>>;
        for (const [key, conditions] of Object.entries(parsed)) {
          if (!ALLOWED_SPEC_KEYS.has(key)) continue;
          if (conditions && typeof conditions === 'object') {
            if (conditions.gte !== undefined) { extraWhere.push(`(p.specs->>'${key}')::numeric >= $${pi++}`); params.push(conditions.gte); }
            if (conditions.lte !== undefined) { extraWhere.push(`(p.specs->>'${key}')::numeric <= $${pi++}`); params.push(conditions.lte); }
            if (conditions.eq !== undefined)  { extraWhere.push(`p.specs->>'${key}' = $${pi++}`); params.push(conditions.eq); }
            // 배열 포함 여부 (JSON 배열 필드용 — 예: supportedSockets @> '"LGA1700"')
            if (conditions.contains !== undefined) {
              extraWhere.push(`p.specs->'${key}' @> $${pi++}::jsonb`);
              params.push(JSON.stringify(conditions.contains));
            }
            // 여러 값 중 하나 일치 (예: ramType IN ('DDR4', 'DDR5'))
            if (conditions.in !== undefined && Array.isArray(conditions.in) && conditions.in.length > 0) {
              const placeholders = (conditions.in as string[]).map(() => `$${pi++}`).join(', ');
              extraWhere.push(`p.specs->>'${key}' IN (${placeholders})`);
              (conditions.in as string[]).forEach((v) => params.push(v));
            }
          }
        }
      } catch { /* JSON 파싱 실패 시 무시 */ }
    }
```

동일한 수정을 count 쿼리의 specs 파싱 블록(L146-158)에도 적용:

```typescript
    // 스펙 필터 (count 쿼리)
    if (specs) {
      try {
        const parsed = JSON.parse(specs) as Record<string, Record<string, unknown>>;
        for (const [key, conditions] of Object.entries(parsed)) {
          if (!ALLOWED_SPEC_KEYS.has(key)) continue;
          if (conditions && typeof conditions === 'object') {
            if (conditions.gte !== undefined) { countExtraWhere.push(`(p.specs->>'${key}')::numeric >= $${ci++}`); countParams.push(conditions.gte); }
            if (conditions.lte !== undefined) { countExtraWhere.push(`(p.specs->>'${key}')::numeric <= $${ci++}`); countParams.push(conditions.lte); }
            if (conditions.eq !== undefined)  { countExtraWhere.push(`p.specs->>'${key}' = $${ci++}`); countParams.push(conditions.eq); }
            if (conditions.contains !== undefined) {
              countExtraWhere.push(`p.specs->'${key}' @> $${ci++}::jsonb`);
              countParams.push(JSON.stringify(conditions.contains));
            }
            if (conditions.in !== undefined && Array.isArray(conditions.in) && conditions.in.length > 0) {
              const placeholders = (conditions.in as string[]).map(() => `$${ci++}`).join(', ');
              countExtraWhere.push(`p.specs->>'${key}' IN (${placeholders})`);
              (conditions.in as string[]).forEach((v) => countParams.push(v));
            }
          }
        }
      } catch { /* JSON 파싱 실패 시 무시 */ }
    }
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `pnpm --filter api test -- --testPathPattern=products.service.spec`
Expected: 4개 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/modules/products/products.service.ts apps/api/src/modules/products/products.service.spec.ts
git commit -m "feat(api): specs 필터에 contains/in 연산자 추가"
```

---

### Task 2: BuildComponent에 specs 필드 추가 + Context 확장

빌더에서 선택된 부품의 스펙 정보를 Context를 통해 앱 전체에서 접근 가능하게 함.

**Files:**
- Modify: `apps/web/src/lib/data.ts:215-232`
- Modify: `apps/web/src/context/BuildEstimatorContext.tsx`
- Modify: `apps/web/src/components/BuildEstimatorPanel.tsx`

- [ ] **Step 1: BuildComponent 인터페이스에 specs 추가**

`apps/web/src/lib/data.ts` L231(quantity 다음)에 추가:

```typescript
export interface BuildComponent {
  category: string;
  categoryName: string;
  productId: string;
  productName: string;
  slug: string;
  brand: string;
  imageUrl: string | null;
  price: number;
  originalPrice?: number | null;
  currency: string;
  storeUrl: string | null;
  storeName: string | null;
  inStock: boolean;
  budgetAllocation?: number;
  performanceScore?: number | null;
  quantity?: number;
  specs?: Record<string, unknown>;  // 호환성 필터용
}
```

- [ ] **Step 2: BuildEstimatorContext 확장**

`apps/web/src/context/BuildEstimatorContext.tsx`에 선택된 부품 목록과 업데이트 함수 추가:

```typescript
'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { BuildComponent } from '@/lib/data';

interface PendingBudget {
  budget: number;
  currency: string;
}

interface BuildEstimatorContextValue {
  isOpen: boolean;
  pendingBudget: PendingBudget | null;
  // 기존
  open: () => void;
  close: () => void;
  toggle: () => void;
  openWithBudget: (budget: number, currency: string) => void;
  clearPendingBudget: () => void;
  // 호환성 필터용 추가
  components: (BuildComponent | null)[];
  setComponents: (components: (BuildComponent | null)[]) => void;
}

const BuildEstimatorContext = createContext<BuildEstimatorContextValue | null>(null);

export function BuildEstimatorProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingBudget, setPendingBudget] = useState<PendingBudget | null>(null);
  const [components, setComponentsState] = useState<(BuildComponent | null)[]>([]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const openWithBudget = useCallback((budget: number, currency: string) => {
    setPendingBudget({ budget, currency });
    setIsOpen(true);
  }, []);

  const clearPendingBudget = useCallback(() => setPendingBudget(null), []);
  const setComponents = useCallback((c: (BuildComponent | null)[]) => setComponentsState(c), []);

  return (
    <BuildEstimatorContext.Provider value={{
      isOpen, pendingBudget,
      open, close, toggle, openWithBudget, clearPendingBudget,
      components, setComponents,
    }}>
      {children}
    </BuildEstimatorContext.Provider>
  );
}

export function useBuildEstimator() {
  const ctx = useContext(BuildEstimatorContext);
  if (!ctx) throw new Error('useBuildEstimator must be used inside BuildEstimatorProvider');
  return ctx;
}
```

- [ ] **Step 3: BuildEstimatorPanel에서 Context 업데이트 연결**

`apps/web/src/components/BuildEstimatorPanel.tsx`에서 `useBuildEstimator`를 이미 import하고 있음. estimate가 변경될 때 Context의 `setComponents`를 호출하도록 수정.

기존 코드에서 `useBuildEstimator()`로부터 `setComponents`를 추가로 destructure:

```typescript
const { isOpen, close, pendingBudget, clearPendingBudget, setComponents } = useBuildEstimator();
```

그리고 estimate가 업데이트되는 위치를 찾아서(estimate state가 set되는 곳), `useEffect`로 Context에 동기화:

```typescript
// estimate 변경 시 Context에 부품 목록 동기화 (호환성 필터용)
useEffect(() => {
  if (estimate?.components) {
    setComponents(estimate.components);
  } else {
    setComponents([]);
  }
}, [estimate, setComponents]);
```

이 `useEffect`를 기존 state 선언 근처(L197 부근)에 추가.

- [ ] **Step 4: 빌드 확인**

Run: `pnpm --filter web build`
Expected: 타입 에러 없이 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/lib/data.ts apps/web/src/context/BuildEstimatorContext.tsx apps/web/src/components/BuildEstimatorPanel.tsx
git commit -m "feat(web): BuildComponent에 specs 추가 + Context로 부품 목록 노출"
```

---

### Task 3: useCompatibilityConstraints 훅 구현

빌더에 담긴 부품의 스펙을 읽어, 현재 보고 있는 카테고리에 맞는 호환성 제약 조건을 반환하는 훅.

**Files:**
- Create: `apps/web/src/hooks/useCompatibilityConstraints.ts`
- Create: `apps/web/src/hooks/useCompatibilityConstraints.test.ts`

- [ ] **Step 1: 테스트 파일 생성**

`apps/web/src/hooks/useCompatibilityConstraints.test.ts`:

```typescript
import { computeConstraints, type CompatibilityConstraint } from './useCompatibilityConstraints';
import type { BuildComponent } from '@/lib/data';

// computeConstraints는 순수 함수로 추출하여 직접 테스트
const makePart = (category: string, specs: Record<string, unknown>): BuildComponent => ({
  category,
  categoryName: category,
  productId: '1',
  productName: 'Test',
  slug: 'test',
  brand: 'Test',
  imageUrl: null,
  price: 100,
  currency: 'KRW',
  storeUrl: null,
  storeName: null,
  inStock: true,
  specs,
});

describe('computeConstraints', () => {
  it('메인보드 선택 시 RAM 카테고리에 type=DDR5 제약', () => {
    const parts = [makePart('motherboard', { ramType: 'DDR5', socket: 'LGA1700', formFactor: 'ATX' })];
    const result = computeConstraints('ram', parts);
    expect(result.constraints).toContainEqual(
      expect.objectContaining({ specKey: 'type', operator: 'eq', value: 'DDR5' }),
    );
  });

  it('메인보드 선택 시 CPU 카테고리에 socket 제약', () => {
    const parts = [makePart('motherboard', { socket: 'LGA1700', ramType: 'DDR5', formFactor: 'ATX' })];
    const result = computeConstraints('cpu', parts);
    expect(result.constraints).toContainEqual(
      expect.objectContaining({ specKey: 'socket', operator: 'eq', value: 'LGA1700' }),
    );
  });

  it('CPU 선택 시 메인보드 카테고리에 socket + ramType 제약', () => {
    const parts = [makePart('cpu', { socket: 'AM5', supportedRam: ['DDR5'] })];
    const result = computeConstraints('motherboard', parts);
    expect(result.constraints).toContainEqual(
      expect.objectContaining({ specKey: 'socket', operator: 'eq', value: 'AM5' }),
    );
    expect(result.constraints).toContainEqual(
      expect.objectContaining({ specKey: 'ramType', operator: 'in', value: ['DDR5'] }),
    );
  });

  it('CPU + 메인보드 선택 시 쿨러 카테고리에 supportedSockets 제약 (중복 제거)', () => {
    const parts = [
      makePart('cpu', { socket: 'LGA1700', supportedRam: ['DDR5'] }),
      makePart('motherboard', { socket: 'LGA1700', ramType: 'DDR5', formFactor: 'ATX' }),
    ];
    const result = computeConstraints('cooler', parts);
    // CPU와 메인보드 모두 LGA1700 → 하나만 남아야 함
    const socketConstraints = result.constraints.filter(c => c.specKey === 'supportedSockets');
    expect(socketConstraints).toHaveLength(1);
    expect(socketConstraints[0].operator).toBe('contains');
    expect(socketConstraints[0].value).toBe('LGA1700');
  });

  it('GPU 선택 시 케이스 카테고리에 maxGpuLengthMm >= GPU lengthMm 제약', () => {
    const parts = [makePart('gpu', { lengthMm: 320 })];
    const result = computeConstraints('case', parts);
    expect(result.constraints).toContainEqual(
      expect.objectContaining({ specKey: 'maxGpuLengthMm', operator: 'gte', value: 320 }),
    );
  });

  it('케이스 선택 시 메인보드 카테고리에 formFactor in 제약', () => {
    const parts = [makePart('case', { supportedFormFactors: ['ATX', 'MicroATX'], psuFormFactor: 'ATX' })];
    const result = computeConstraints('motherboard', parts);
    expect(result.constraints).toContainEqual(
      expect.objectContaining({ specKey: 'formFactor', operator: 'in', value: ['ATX', 'MicroATX'] }),
    );
  });

  it('케이스 선택 시 PSU 카테고리에 formFactor 제약', () => {
    const parts = [makePart('case', { supportedFormFactors: ['ATX'], psuFormFactor: 'ATX' })];
    const result = computeConstraints('psu', parts);
    expect(result.constraints).toContainEqual(
      expect.objectContaining({ specKey: 'formFactor', operator: 'eq', value: 'ATX' }),
    );
  });

  it('빌더에 부품이 없으면 빈 제약 반환', () => {
    const result = computeConstraints('ram', []);
    expect(result.constraints).toHaveLength(0);
    expect(result.specsFilter).toEqual({});
  });

  it('관련 없는 카테고리에는 제약 없음', () => {
    const parts = [makePart('motherboard', { socket: 'LGA1700', ramType: 'DDR5', formFactor: 'ATX' })];
    const result = computeConstraints('ssd', parts);
    expect(result.constraints).toHaveLength(0);
  });

  it('specsFilter가 올바른 API 파라미터 형식으로 변환됨', () => {
    const parts = [makePart('motherboard', { ramType: 'DDR5', socket: 'LGA1700', formFactor: 'ATX' })];
    const result = computeConstraints('ram', parts);
    expect(result.specsFilter).toEqual({ type: { eq: 'DDR5' } });
  });

  it('activeSummary에 사람이 읽을 수 있는 요약 포함', () => {
    const parts = [makePart('motherboard', { ramType: 'DDR5', socket: 'LGA1700', formFactor: 'ATX' })];
    const result = computeConstraints('ram', parts);
    expect(result.activeSummary.length).toBeGreaterThan(0);
    expect(result.activeSummary[0]).toContain('DDR5');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `pnpm --filter web test -- --testPathPattern=useCompatibilityConstraints`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 훅 구현**

`apps/web/src/hooks/useCompatibilityConstraints.ts`:

```typescript
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

// 카테고리 slug → 한국어 라벨
const CAT_LABEL: Record<string, string> = {
  cpu: 'CPU', gpu: 'GPU', motherboard: '메인보드', ram: 'RAM',
  psu: 'PSU', case: '케이스', cooler: '쿨러', ssd: 'SSD',
};

/**
 * 순수 함수: 빌더 부품 목록 + 대상 카테고리 → 호환성 제약 조건 계산.
 * 테스트 용이성을 위해 훅과 분리.
 */
export function computeConstraints(
  targetCategory: string,
  components: (BuildComponent | null)[],
): ConstraintResult {
  const constraints: CompatibilityConstraint[] = [];
  const parts = components.filter(Boolean) as BuildComponent[];

  for (const part of parts) {
    const specs = part.specs;
    if (!specs || Object.keys(specs).length === 0) continue;
    const srcLabel = CAT_LABEL[part.category] ?? part.category;

    // CPU → 메인보드
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

    // CPU → 쿨러
    if (part.category === 'cpu' && targetCategory === 'cooler') {
      if (specs.socket) {
        constraints.push({
          specKey: 'supportedSockets', operator: 'contains', value: specs.socket as string,
          source: `${srcLabel}: ${specs.socket}`, rule: 'cooler-cpu-socket',
        });
      }
    }

    // 메인보드 → CPU
    if (part.category === 'motherboard' && targetCategory === 'cpu') {
      if (specs.socket) {
        constraints.push({
          specKey: 'socket', operator: 'eq', value: specs.socket as string,
          source: `${srcLabel}: ${specs.socket}`, rule: 'cpu-mobo-socket',
        });
      }
    }

    // 메인보드 → RAM
    if (part.category === 'motherboard' && targetCategory === 'ram') {
      if (specs.ramType) {
        constraints.push({
          specKey: 'type', operator: 'eq', value: specs.ramType as string,
          source: `${srcLabel}: ${specs.ramType}`, rule: 'ram-mobo-type',
        });
      }
    }

    // 메인보드 → 케이스
    if (part.category === 'motherboard' && targetCategory === 'case') {
      if (specs.formFactor) {
        constraints.push({
          specKey: 'supportedFormFactors', operator: 'contains', value: specs.formFactor as string,
          source: `${srcLabel}: ${specs.formFactor}`, rule: 'mobo-case-formfactor',
        });
      }
    }

    // 메인보드 → 쿨러
    if (part.category === 'motherboard' && targetCategory === 'cooler') {
      if (specs.socket) {
        constraints.push({
          specKey: 'supportedSockets', operator: 'contains', value: specs.socket as string,
          source: `${srcLabel}: ${specs.socket}`, rule: 'cooler-mobo-socket',
        });
      }
    }

    // GPU → 케이스
    if (part.category === 'gpu' && targetCategory === 'case') {
      if (specs.lengthMm) {
        constraints.push({
          specKey: 'maxGpuLengthMm', operator: 'gte', value: specs.lengthMm as number,
          source: `${srcLabel}: ${specs.lengthMm}mm`, rule: 'gpu-case-length',
        });
      }
    }

    // 케이스 → 메인보드
    if (part.category === 'case' && targetCategory === 'motherboard') {
      if (Array.isArray(specs.supportedFormFactors) && specs.supportedFormFactors.length > 0) {
        constraints.push({
          specKey: 'formFactor', operator: 'in', value: specs.supportedFormFactors as string[],
          source: `${srcLabel}: ${(specs.supportedFormFactors as string[]).join('/')}`, rule: 'mobo-case-formfactor',
        });
      }
    }

    // 케이스 → PSU
    if (part.category === 'case' && targetCategory === 'psu') {
      if (specs.psuFormFactor) {
        constraints.push({
          specKey: 'formFactor', operator: 'eq', value: specs.psuFormFactor as string,
          source: `${srcLabel}: ${specs.psuFormFactor}`, rule: 'psu-case-formfactor',
        });
      }
    }

    // 케이스 → GPU
    if (part.category === 'case' && targetCategory === 'gpu') {
      if (specs.maxGpuLengthMm) {
        constraints.push({
          specKey: 'lengthMm', operator: 'lte', value: specs.maxGpuLengthMm as number,
          source: `${srcLabel}: 최대 ${specs.maxGpuLengthMm}mm`, rule: 'gpu-case-length',
        });
      }
    }

    // 케이스 → 쿨러
    if (part.category === 'case' && targetCategory === 'cooler') {
      if (specs.maxCoolerHeightMm) {
        constraints.push({
          specKey: 'heightMm', operator: 'lte', value: specs.maxCoolerHeightMm as number,
          source: `${srcLabel}: 최대 ${specs.maxCoolerHeightMm}mm`, rule: 'cooler-case-height',
        });
      }
    }
  }

  // 중복 제거: 같은 specKey + operator + value 조합
  const seen = new Set<string>();
  const deduplicated = constraints.filter((c) => {
    const key = `${c.specKey}:${c.operator}:${JSON.stringify(c.value)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // specsFilter 변환 (API 파라미터 형식)
  const specsFilter: Record<string, Record<string, unknown>> = {};
  for (const c of deduplicated) {
    specsFilter[c.specKey] = { [c.operator]: c.value };
  }

  // 사람이 읽을 수 있는 요약
  const activeSummary = deduplicated.map((c) => c.source);

  return { constraints: deduplicated, specsFilter, activeSummary };
}

/**
 * React 훅: 빌더 컨텍스트에서 부품을 읽어 호환성 제약 반환.
 */
export function useCompatibilityConstraints(
  targetCategory: string,
  components: (BuildComponent | null)[],
): ConstraintResult {
  return useMemo(
    () => computeConstraints(targetCategory, components),
    [targetCategory, components],
  );
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `pnpm --filter web test -- --testPathPattern=useCompatibilityConstraints`
Expected: 10개 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/hooks/useCompatibilityConstraints.ts apps/web/src/hooks/useCompatibilityConstraints.test.ts
git commit -m "feat(web): useCompatibilityConstraints 훅 — 빌더 부품 기반 호환성 제약 계산"
```

---

### Task 4: CompatibilityBanner 컴포넌트

호환성 필터 상태를 보여주는 배너 UI. 적용 중인 제약 태그 + "비호환 제품도 보기" 토글.

**Files:**
- Create: `apps/web/src/components/CompatibilityBanner.tsx`

- [ ] **Step 1: 컴포넌트 생성**

`apps/web/src/components/CompatibilityBanner.tsx`:

```tsx
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
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm --filter web build`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/components/CompatibilityBanner.tsx
git commit -m "feat(web): CompatibilityBanner 컴포넌트 — 호환성 필터 상태 + 토글 UI"
```

---

### Task 5: ProductFilters에 호환성 필터 통합

ProductFilters에서 빌더 Context의 부품을 읽어, 호환성 제약을 specs 파라미터에 병합하고, 배너와 잠긴 필터를 표시.

**Files:**
- Modify: `apps/web/src/components/ProductFilters.tsx`
- Modify: `apps/web/src/components/SpecFilterPanel.tsx`

- [ ] **Step 1: ProductFilters에 호환성 로직 추가**

`apps/web/src/components/ProductFilters.tsx` 상단에 import 추가:

```typescript
import { useBuildEstimator } from '@/context/BuildEstimatorContext';
import { useCompatibilityConstraints } from '@/hooks/useCompatibilityConstraints';
import { CompatibilityBanner } from './CompatibilityBanner';
```

컴포넌트 본문(L30 부근, `useTransition` 아래)에 추가:

```typescript
  const { components: builderComponents } = useBuildEstimator();
  const [showIncompatible, setShowIncompatible] = useState(false);

  // 현재 카테고리에 대한 호환성 제약 계산
  // categoryName → slug 변환 (DB 카테고리명 기반)
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, '');
  const { constraints, specsFilter, activeSummary } = useCompatibilityConstraints(
    categorySlug,
    builderComponents,
  );
```

`useState` import에 `useState` 추가 (이미 있으면 생략).

specs 파라미터 병합 로직 — 기존 `specsObj` 계산 직후에 추가:

```typescript
  // 호환성 제약을 specs에 병합 (비호환 표시 OFF일 때만)
  const mergedSpecsObj = useMemo(() => {
    if (showIncompatible || Object.keys(specsFilter).length === 0) return specsObj;
    return { ...specsObj, ...specsFilter };
  }, [specsObj, specsFilter, showIncompatible]);
```

`useMemo` import 추가.

기존 `updateSpec` 함수에서 `specsObj` 대신 `mergedSpecsObj`를 사용하도록 수정. 단, `updateSpec`은 사용자의 수동 필터 변경이므로, 호환성 제약은 별도로 유지해야 함. 따라서 API 호출 시에만 병합:

기존 specs 쿼리 파라미터가 변경될 때가 아니라, **specsFilter가 변경될 때** URL을 자동 업데이트하는 effect 추가:

```typescript
  // 호환성 필터가 변경되면 specs 파라미터에 병합하여 URL 업데이트
  useEffect(() => {
    if (Object.keys(specsFilter).length === 0) return;
    if (showIncompatible) {
      // 토글 ON: 호환성 제약 제거, 사용자 필터만 유지
      const userOnly = { ...specsObj };
      for (const key of Object.keys(specsFilter)) {
        // specsFilter에서 온 키이면서 사용자가 직접 선택한 게 아니면 제거
        if (JSON.stringify(userOnly[key]) === JSON.stringify(specsFilter[key])) {
          delete userOnly[key];
        }
      }
      const str = Object.keys(userOnly).length > 0 ? JSON.stringify(userOnly) : '';
      if (str !== params.specs) apply({ specs: str, page: '1' });
    } else {
      // 토글 OFF: 호환성 제약 병합
      const merged = { ...specsObj, ...specsFilter };
      const str = JSON.stringify(merged);
      if (str !== params.specs) apply({ specs: str, page: '1' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specsFilter, showIncompatible]);
```

렌더에서 `SpecFilterPanel` 바로 위에 배너 추가:

```tsx
        {/* 호환성 배너 */}
        <CompatibilityBanner
          constraints={constraints}
          activeSummary={activeSummary}
          showIncompatible={showIncompatible}
          onToggleIncompatible={setShowIncompatible}
        />
```

- [ ] **Step 2: SpecFilterPanel에 잠긴 필터 표시 추가**

`apps/web/src/components/SpecFilterPanel.tsx`의 Props 확장:

```typescript
interface Props {
  facets: FacetsResponse | null;
  categoryId: string;
  lockedSpecs?: Record<string, unknown>;  // 호환성으로 잠긴 스펙 값
}
```

`export function SpecFilterPanel({ facets, categoryId, lockedSpecs }: Props)` 로 수정.

enum 렌더링(L103-129)에서 잠긴 값 처리 추가:

```tsx
          // enum 타입
          const selected = (specsObj[key] as string[] | undefined) ?? [];
          const lockedValue = lockedSpecs?.[key];
          // 잠긴 값 계산: eq → 단일 값, in → 배열
          const lockedValues: string[] = lockedValue
            ? typeof lockedValue === 'object' && 'eq' in (lockedValue as Record<string, unknown>)
              ? [(lockedValue as Record<string, string>).eq]
              : typeof lockedValue === 'object' && 'in' in (lockedValue as Record<string, unknown>)
                ? (lockedValue as Record<string, string[]>).in
                : []
            : [];
          const isLocked = lockedValues.length > 0;

          return (
            <div key={key} className="flex items-start gap-2">
              <span className="shrink-0 w-24 text-xs text-gray-400 pt-1">{label}</span>
              <div className="flex flex-wrap gap-1.5">
                {spec.values?.map((val) => {
                  const isLockedValue = lockedValues.includes(val);
                  const isDisabledByLock = isLocked && !isLockedValue;
                  const isActive = selected.includes(val) || isLockedValue;
                  return (
                    <button
                      key={val}
                      onClick={() => !isLockedValue && !isDisabledByLock && toggleSpecEnum(key, val)}
                      disabled={isPending || isLockedValue || isDisabledByLock}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                        isLockedValue
                          ? 'bg-blue-900/50 border-blue-500/40 text-blue-300 cursor-default'
                          : isDisabledByLock
                            ? 'bg-gray-900 border-gray-700 text-gray-600 cursor-not-allowed line-through opacity-40'
                            : isActive
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-gray-900 border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white'
                      }`}
                    >
                      {val}{isLockedValue && ' 🔒'}
                    </button>
                  );
                })}
              </div>
            </div>
          );
```

ProductFilters에서 SpecFilterPanel에 `lockedSpecs` 전달:

```tsx
        <SpecFilterPanel
          facets={facets}
          categoryId={params.categoryId}
          lockedSpecs={showIncompatible ? undefined : specsFilter}
        />
```

- [ ] **Step 3: 빌드 확인**

Run: `pnpm --filter web build`
Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/components/ProductFilters.tsx apps/web/src/components/SpecFilterPanel.tsx
git commit -m "feat(web): ProductFilters에 호환성 필터 통합 — 배너, 잠긴 필터, 토글"
```

---

### Task 6: 비호환 제품 표시 (토글 ON)

"비호환 제품도 보기" 토글이 ON일 때, 비호환 제품에 뱃지와 사유를 표시.

**Files:**
- Modify: `apps/web/src/app/products/page.tsx`
- Modify: `apps/web/src/components/ProductListRow.tsx` (비호환 스타일 추가)

- [ ] **Step 1: ProductListRow에 incompatible prop 추가**

`apps/web/src/components/ProductListRow.tsx`의 Props에 추가:

```typescript
interface Props {
  p: ProductListItem;  // 기존
  incompatibleReason?: string | null;  // 추가
}
```

컴포넌트 본문에서 비호환 스타일 적용:

```tsx
export function ProductListRow({ p, incompatibleReason }: Props) {
  // ... 기존 코드

  return (
    <div className={`relative ... ${incompatibleReason ? 'opacity-45' : ''}`}>
      {incompatibleReason && (
        <>
          <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md z-10">
            호환 불가
          </span>
          <p className="text-[10px] text-red-400 mt-1 bg-red-900/20 px-2 py-1 rounded">
            {incompatibleReason}
          </p>
        </>
      )}
      {/* ... 나머지 기존 UI */}
    </div>
  );
}
```

- [ ] **Step 2: products/page.tsx 수정 — 비호환 사유 전달은 클라이언트에서 처리**

`products/page.tsx`는 서버 컴포넌트이므로 빌더 Context에 접근 불가. 비호환 판단은 클라이언트 래퍼 컴포넌트로 위임.

`apps/web/src/components/ProductListWithCompatibility.tsx` 신규 생성:

```tsx
'use client';

import { useBuildEstimator } from '@/context/BuildEstimatorContext';
import { useCompatibilityConstraints } from '@/hooks/useCompatibilityConstraints';
import { ProductListRow } from './ProductListRow';

interface ProductItem {
  id: string;
  specs: Record<string, unknown>;
  [key: string]: unknown;
}

interface Props {
  products: ProductItem[];
  categorySlug: string;
}

export function ProductListWithCompatibility({ products, categorySlug }: Props) {
  const { components } = useBuildEstimator();
  const { constraints } = useCompatibilityConstraints(categorySlug, components);

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
          p={p as any}
          incompatibleReason={getIncompatibleReason(p.specs ?? {})}
        />
      ))}
    </div>
  );
}
```

`apps/web/src/app/products/page.tsx`에서 기존 제품 목록 렌더링을 이 컴포넌트로 교체:

import 추가:
```typescript
import { ProductListWithCompatibility } from '@/components/ProductListWithCompatibility';
```

기존 L144-149:
```tsx
          <div className="flex flex-col gap-1.5">
            {products.map((p) => (
              <ProductListRow key={p.id} p={p} />
            ))}
          </div>
```

교체:
```tsx
          <ProductListWithCompatibility
            products={products}
            categorySlug={activeCategoryName.toLowerCase().replace(/\s+/g, '')}
          />
```

`ProductListRow` import는 `ProductListWithCompatibility`에서 사용하므로 page.tsx에서는 제거 가능 (단, 빈 상태 표시에서 사용하지 않는지 확인).

- [ ] **Step 3: 빌드 확인**

Run: `pnpm --filter web build`
Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/components/ProductListRow.tsx apps/web/src/components/ProductListWithCompatibility.tsx apps/web/src/app/products/page.tsx
git commit -m "feat(web): 비호환 제품 표시 — 뱃지 + 사유 + 반투명 오버레이"
```

---

### Task 7: 통합 테스트 + 수동 검증

전체 흐름을 연결하고 동작을 검증.

**Files:** 없음 (기존 파일 확인만)

- [ ] **Step 1: 빌드 확인**

Run: `pnpm build`
Expected: api + web 빌드 모두 성공

- [ ] **Step 2: 전체 테스트 실행**

Run: `pnpm test`
Expected: 기존 테스트 + 새 테스트 모두 PASS

- [ ] **Step 3: 수동 검증 — 개발 서버 실행**

Run: `pnpm dev`

검증 시나리오:
1. 빌더에서 견적 계산 (LGA1700 + DDR5 메인보드 포함)
2. `/products?categoryId=<RAM카테고리ID>` 이동
3. "빌더 호환성 필터 적용 중" 배너 표시 확인
4. DDR 필터에서 DDR5가 잠금, DDR3/DDR4가 비활성 확인
5. DDR5 RAM만 목록에 표시 확인
6. "비호환 제품도 보기" 토글 ON
7. DDR4 RAM이 반투명 + "호환 불가" 뱃지로 표시 확인
8. 필터 잠금 해제 확인

- [ ] **Step 4: 커밋 (수정 사항이 있었을 경우)**

```bash
git add -A
git commit -m "fix(web): 호환성 필터 통합 테스트 중 발견된 이슈 수정"
```
