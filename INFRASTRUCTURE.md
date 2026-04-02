# PCPriceTrack 인프라 정보

포트폴리오 및 기술 문서용 서버 구성 정리

---

## 서비스 구성 요약

| 역할 | 서비스 | 플랜 | 비용 |
|------|--------|------|------|
| 프론트엔드 | Vercel | Free | 무료 |
| 백엔드 API | Render | Free | 무료 |
| 데이터베이스 | Supabase (PostgreSQL) | Free | 무료 |
| 캐시 / 큐 | Upstash (Redis) | Free | 무료 |
| 크롤러 실행 | 로컬 노트북 | - | - |

> **총 운영 비용: $0/월** (완전 무료 스택)

---

## 아키텍처 다이어그램

```
사용자 브라우저
     │
     ▼
┌─────────────────────────┐
│  Vercel (Next.js 15)    │  https://pcpricetrack.vercel.app
│  - SSR / App Router     │
│  - 정적 자산 CDN         │
└──────────┬──────────────┘
           │ HTTPS REST API
           ▼
┌─────────────────────────┐
│  Render (NestJS API)    │  https://pcpricetrack.onrender.com
│  - REST API 서버         │
│  - JWT 인증              │
│  - Bull 큐 워커          │
│  - 크롤러 스케줄러        │
└────┬────────────┬────────┘
     │            │
     ▼            ▼
┌─────────┐  ┌──────────────┐
│Supabase │  │   Upstash    │
│PostgreSQL│  │    Redis     │
│ - 상품   │  │ - Bull 작업 큐│
│ - 가격   │  │ - 서킷브레이커│
│ - 유저   │  │ - 세션 캐시  │
└─────────┘  └──────────────┘
     ▲
     │ 크롤링 데이터 저장
┌────┴────────────────────┐
│  로컬 노트북 (크롤러)    │
│  - Playwright Chromium  │
│  - Amazon 크롤링        │
│  - Newegg 크롤링        │
└─────────────────────────┘
```

---

## 서비스별 상세

### Vercel (프론트엔드)
- **URL**: https://pcpricetrack.vercel.app
- **프레임워크**: Next.js 15 (App Router)
- **배포 방식**: GitHub 연동 → push 시 자동 배포
- **주요 환경변수**:
  ```
  NEXT_PUBLIC_API_URL=https://pcpricetrack.onrender.com/api
  ```

### Render (백엔드 API)
- **URL**: https://pcpricetrack.onrender.com
- **헬스체크**: https://pcpricetrack.onrender.com/api/health
- **프레임워크**: NestJS 10 (Node.js 22)
- **배포 방식**: GitHub 연동 → push 시 자동 배포
- **Root Directory**: `apps/api`
- **Build Command**: `pnpm install --prod=false && pnpm build`
- **Start Command**: `node dist/main`
- **제약사항**: 무료 플랜 → 15분 비활성 시 슬립 (첫 요청 시 ~30초 재시작)

### Supabase (PostgreSQL)
- **Region**: AWS ap-northeast-2 (서울)
- **연결 방식**: Transaction Pooler (IPv4, 포트 6543)
- **Host**: `aws-1-ap-northeast-2.pooler.supabase.com`
- **DB**: `postgres`
- **무료 한도**: 500MB 스토리지, 2개 프로젝트

### Upstash (Redis)
- **Region**: AWS ap-northeast-1 (도쿄)
- **Host**: `rested-macaque-75416.upstash.io`
- **Port**: 6379 (TLS 필수)
- **용도**: Bull 작업 큐, 서킷 브레이커 상태 관리
- **무료 한도**: 500K commands/월, 256MB

---

## 기술 스택 전체

### 백엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| NestJS | 10 | API 서버 프레임워크 |
| Drizzle ORM | 0.38 | DB 쿼리 빌더 |
| PostgreSQL | 16 | 주 데이터베이스 |
| Bull | 4 | 작업 큐 |
| Redis (ioredis) | 5 | 큐 브로커 / 캐시 |
| Playwright | 1.58 | 웹 크롤링 |
| Passport + JWT | - | 인증 |
| Zod | 3 | 환경변수 검증 |
| nestjs-pino | 4 | 구조화 로깅 |

### 프론트엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 15 | React 프레임워크 |
| React | 19 | UI 라이브러리 |
| Tailwind CSS | 3 | 스타일링 |
| Recharts | - | 가격 히스토리 차트 |

### 인프라 / DevOps
| 기술 | 용도 |
|------|------|
| Turborepo | 모노레포 빌드 시스템 |
| pnpm workspaces | 패키지 관리 |
| Docker Compose | 로컬 개발 환경 |
| GitHub Actions | CI/CD (예정) |

---

## 주요 기능

- **가격 추적**: Amazon, Newegg 실시간 크롤링 → GPU/CPU/RAM/SSD 가격 기록
- **가격 히스토리**: append-only price_records 테이블로 30일 차트
- **특가 알림**: 목표 가격 도달 시 이메일 알림
- **PC 견적 계산기**: 예산 입력 → 최적 부품 자동 조합 (예산 배분: GPU 40%, CPU 25%, RAM 20%, SSD 15%)
- **서킷 브레이커**: 10분 내 10회 실패 시 크롤링 자동 차단 → 5분 후 재시도
- **JWT 인증**: Access Token(15분) + Refresh Token(7일)

---

## 로컬 개발 환경

```
MacBook (로컬)
├── Next.js Dev Server (:3000)
├── NestJS Dev Server (:3001)
└── Docker
    ├── PostgreSQL (:5432)
    └── Redis (:6379)
```

프로덕션과 분리된 로컬 DB 사용 권장.
크롤러 데이터를 프로덕션 Supabase에 직접 쌓을 때는 `.env`의 DB 정보를 Supabase로 변경.
