# Phase 2 — 게임 데이터 기반 병목 분석

## 현재 상태 (Phase 1 완료)

`calcBottleneck()` 함수가 CPU/GPU `performanceScore`와 해상도별 픽셀 팩터로 병목 %를 계산한다.

```
gpuEffective = gpuScore / pixelFactor(res)   // 1080p=1.00, 1440p=1.78, 4K=4.00
cpuEffective = cpuScore × usageMultiplier(usage)
bottleneckPct = |1 - gpuEff/cpuEff| × 100
```

**한계**: 단순 비율 계산이라 실제 게임별 편차(CPU 집약적 게임 vs GPU 집약적 게임)를 반영하지 못한다.

---

## Phase 2 목표

pc-builds.com 방식처럼 **인기 게임별 예상 FPS 커버리지 표** 제공:

| 해상도 | 30+ FPS | 60+ FPS | 90+ FPS | 120+ FPS | 144+ FPS |
|--------|---------|---------|---------|----------|----------|
| 1080p  | 100%    | 100%    | 100%    | 98%      | 92%      |
| 1440p  | 100%    | 100%    | 99%     | 81%      | 59%      |
| 4K     | 100%    | 95%     | 61%     | 35%      | 20%      |

---

## 필요 데이터 구조

### 게임 프로파일 테이블 (신규)

```sql
CREATE TABLE game_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,        -- "Cyberpunk 2077"
  slug        VARCHAR(200) UNIQUE NOT NULL,
  is_popular  BOOLEAN DEFAULT false,        -- 인기 게임 100개 선정
  cpu_factor  NUMERIC(4,3) NOT NULL,        -- CPU 민감도 (0.5~1.5)
  gpu_factor  NUMERIC(4,3) NOT NULL,        -- GPU 민감도 (0.5~1.5)
  baseline_fps_1080p NUMERIC(6,1),          -- 레퍼런스 구성에서의 기준 FPS
  baseline_fps_1440p NUMERIC(6,1),
  baseline_fps_4k    NUMERIC(6,1),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 레퍼런스 구성: RTX 4070 + i7-13700K (cpuScore≈55000, gpuScore≈38000)
```

### FPS 추정 공식

```
estFPS(game, res, cpuScore, gpuScore) =
  min(
    cpuScore × game.cpuFactor × resCpuFactor(res),
    gpuScore × game.gpuFactor / pixelFactor(res)
  ) / normConst

resCpuFactor: { 1080p: 1.0, 1440p: 0.95, 4K: 0.9 }  // CPU는 해상도 영향 적음
normConst: baseline에서 60fps가 나오도록 역산
```

### 커버리지 계산

```
coverage(threshold, res) =
  인기게임 N개 중 estFPS(game, res, cpu, gpu) >= threshold 인 게임 수 / N
```

---

## 데이터 수집 계획

### Option A — 수동 큐레이션 (MVP, 빠름)
- 인기 게임 20~30개 수동으로 `cpu_factor`, `gpu_factor`, `baseline_fps` 입력
- 출처: [TechPowerUp GPU 리뷰](https://www.techpowerup.com/gpu-specs/), [Digital Foundry](https://www.eurogamer.net/digital-foundry), [GameGPU.ru](https://gamegpu.com/)
- 작업 시간: 1~2일
- 정확도: 중간 (수동 추정 오차 ±15%)

### Option B — 크롤링 (정확, 느림)
- [GameGPU.ru](https://gamegpu.com/) — CPU/GPU별 실측 FPS 데이터 공개
- [TechPowerUp](https://www.techpowerup.com/) — GPU 벤치마크
- 주의: 저작권 확인 필요, 상업적 이용 가능 여부 검토
- 작업 시간: 1~2주 (크롤러 + 데이터 정제)

### Option C — OpenBenchmarking (오픈소스)
- [OpenBenchmarking.org](https://openbenchmarking.org/) Phoronix Test Suite 데이터
- API 존재, 비게임 벤치마크 위주라 게임 데이터 커버리지 낮음

**추천 순서**: Option A (MVP) → 검증 후 Option B로 확장

---

## API 설계 (Phase 2)

### 엔드포인트

```
GET /api/builder/fps-coverage?cpuScore=55000&gpuScore=38000
```

### 응답

```json
{
  "referenceCpu": "i7-13700K급",
  "referenceGpu": "RTX 4070급",
  "coverage": [
    {
      "resolution": "1080p",
      "thresholds": {
        "30":  100,
        "60":  100,
        "90":  100,
        "120": 98,
        "144": 92
      }
    },
    { "resolution": "1440p", "thresholds": { "30":100, "60":100, "90":99, "120":81, "144":59 } },
    { "resolution": "4K",    "thresholds": { "30":100, "60":95,  "90":61, "120":35, "144":20 } }
  ],
  "gameCount": 100
}
```

---

## UI 설계 (Phase 2)

현재 `상세 보기` 탭 아래에 추가:

```
인기 게임 100개 기준 예상 성능
                30+ FPS  60+ FPS  90+ FPS  120+ FPS  144+ FPS
1080p           ████100  ████100  ████100  ▓▓▓▓ 98   ▓▓▓▓ 92
1440p           ████100  ████100  ████ 99  ▓▓▓  81   ▓▓   59
4K              ████100  ████ 95  ▓▓▓  61  ▓▓   35   ▓    20
```

---

## 구현 순서

1. `game_profiles` 테이블 마이그레이션 생성
2. 인기 게임 20개 수동 시드 데이터 작성 (`seed-games.ts`)
3. `BuilderService.fpsCoverage(cpuScore, gpuScore)` 구현
4. `/api/builder/fps-coverage` 엔드포인트 추가
5. 프론트 `BuildEstimatorPanel` 상세 탭에 커버리지 표 추가
6. 게임 데이터 30개 → 50개 → 100개 점진적 확장

---

## 참고 링크

- [pc-builds.com 병목 계산기 (참고 UI)](https://pc-builds.com/ko/bottleneck-calculator/)
- [TechPowerUp GPU DB](https://www.techpowerup.com/gpu-specs/)
- [GameGPU 벤치마크](https://gamegpu.com/)
- [UserBenchmark (논란 있음, 참고용만)](https://www.userbenchmark.com/)
