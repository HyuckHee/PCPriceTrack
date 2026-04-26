# 공통 호환성 필터 시스템

## 개요

빌더 패널에 선택된 부품의 스펙을 기반으로, 제품 목록 페이지에서 호환 가능한 제품만 자동 필터링하는 공통 시스템.

## 목표

- 메인보드가 DDR5만 지원하면 RAM 카테고리에서 DDR5만 표시
- CPU ↔ 메인보드 소켓, GPU ↔ 케이스 크기 등 주요 호환성 규칙 전체 적용
- 빌더/제품 목록/딜 등 어디서든 재사용 가능한 공통 모듈

## 접근법

API 서버에서 호환성 필터링 (접근법 A). 기존 `specs` 쿼리 파라미터에 호환성 제약 조건을 추가하여 DB 레벨에서 필터링. 새 API 엔드포인트 불필요. 트래픽 영향 없음.

## 호환성 규칙

| 선택된 부품 | 대상 카테고리 | 스펙 키 | 제약 조건 |
|---|---|---|---|
| CPU (socket) | 메인보드 | socket | eq |
| CPU (supportedRam) | 메인보드 | ramType | in |
| CPU (socket) | 쿨러 | supportedSockets | contains |
| 메인보드 (socket) | CPU | socket | eq |
| 메인보드 (ramType) | RAM | type | eq |
| 메인보드 (formFactor) | 케이스 | supportedFormFactors | contains |
| 메인보드 (socket) | 쿨러 | supportedSockets | contains |
| GPU (lengthMm) | 케이스 | maxGpuLengthMm | gte (케이스 값 >= GPU 값) |
| 케이스 (supportedFormFactors) | 메인보드 | formFactor | in |
| 케이스 (psuFormFactor) | PSU | formFactor | eq |
| 케이스 (maxGpuLengthMm) | GPU | lengthMm | lte |
| 케이스 (maxCoolerHeightMm) | 쿨러 | heightMm | lte |

### 제약 조건 타입

- `eq`: 정확히 일치 (`specs->>'key' = value`)
- `in`: 배열 내 포함 (`specs->>'key' IN (values)`)
- `contains`: JSON 배열에 값 포함 (`specs->'key' @> '"value"'`)
- `lte`: 이하 (`(specs->>'key')::numeric <= value`)
- `gte`: 이상 (`(specs->>'key')::numeric >= value`)

## 데이터 흐름

```
빌더 패널에서 부품 선택/제거
  -> BuildEstimatorContext에 선택된 부품의 specs 저장
  -> /products 페이지에서 카테고리 변경 시
  -> useCompatibilityConstraints(currentCategory, builderParts) 훅이 제약 조건 계산
  -> 기존 specs 쿼리 파라미터에 제약 조건 병합
  -> API 요청 (기존 products.list 엔드포인트, 추가 WHERE 조건)
```

## 변경 사항

### 1. BuildComponent 인터페이스에 specs 추가

`apps/web/src/lib/data.ts`의 `BuildComponent`에 `specs` 필드 추가.

```typescript
export interface BuildComponent {
  // ... 기존 필드
  specs?: Record<string, unknown>;
}
```

### 2. 빌더 API 응답에 specs 포함

`apps/api/src/modules/builder/builder.service.ts`의 `fetchCandidates()` 결과에 제품 specs를 포함하도록 수정.

### 3. BuildEstimatorContext 확장

현재 `BuildEstimatorContext`는 open/close 상태만 관리. 선택된 부품 목록(`BuildComponent[]`)에 접근 가능하도록 확장 필요. 현재 `BuildEstimatorPanel` 내부 state로 관리되는 `estimate.components`를 Context 레벨로 올림.

### 4. 호환성 제약 훅 신규 생성

```typescript
// apps/web/src/hooks/useCompatibilityConstraints.ts

interface CompatibilityConstraint {
  specKey: string;        // 대상 카테고리의 스펙 키 (예: 'type')
  operator: 'eq' | 'in' | 'contains' | 'lte' | 'gte';
  value: string | number | string[];
  source: string;         // 어떤 부품에서 온 제약인지 (예: '메인보드: DDR5')
  rule: string;           // 규칙 이름 (예: 'ram-mobo-type')
}

function useCompatibilityConstraints(
  categorySlug: string,
  components: (BuildComponent | null)[]
): {
  constraints: CompatibilityConstraint[];
  specsFilter: Record<string, unknown>;  // API specs 파라미터에 병합할 객체
  activeSummary: string[];               // UI 표시용 요약 (예: ['소켓: LGA1700', '메모리: DDR5'])
}
```

### 5. SpecFilterPanel 수정

- 상단에 호환성 배너 표시 (빌더에 부품이 있고, 현재 카테고리에 제약이 있을 때만)
- "비호환 제품도 보기" 토글
- 호환성으로 잠긴 enum 값은 `🔒` 표시, 비호환 값은 비활성+취소선
- 토글 ON 시 잠금 해제, 전체 값 선택 가능

### 6. 제품 카드 비호환 표시

"비호환 제품도 보기" 토글 ON 상태에서:
- 비호환 제품 카드에 반투명 오버레이 (opacity: 0.45)
- "호환 불가" 뱃지 (우측 상단, 빨간색)
- 사유 한 줄 표시 (예: "DDR4 — 메인보드(DDR5)와 호환되지 않음")

비호환 여부 판단: 프론트에서 `useCompatibilityConstraints`의 제약 조건과 제품 specs를 비교.

### 7. API 변경

새 API 엔드포인트 없음. 기존 `products.service.ts`의 `list()` 메서드가 이미 specs 파라미터를 처리하므로, 프론트에서 제약 조건을 specs 파라미터에 병합하여 전달하면 됨.

단, `contains` 연산자(JSON 배열 포함 여부)는 현재 `ALLOWED_SPEC_KEYS` + specs 파싱 로직에서 지원하지 않으므로 추가 필요:
- `products.service.ts` specs 파싱에 `contains` 조건 추가: `p.specs->'key' @> '"value"'`
- `in` 조건 추가: `p.specs->>'key' IN (values)`

## UI 목업

`docs/mockups/compatibility-filter-mockup.html` 참조.

- 상태 1 (기본): 호환 제품만 표시, 비호환 enum 값 비활성
- 상태 2 (토글 ON): 전체 표시, 비호환 제품에 뱃지+사유

## 스코프 외

- 호환성 규칙의 공유 패키지화 (추후 필요 시 리팩터링)
- Facets 엔드포인트 수정 (호환 제품만의 facet 재계산은 하지 않음)
- 빌더 자동 추천 로직 수정 (기존 fetchCandidates의 사전 필터링은 별개)
