# PCPriceTrack

PC 하드웨어(CPU, GPU, RAM, SSD 등)의 가격을 여러 쇼핑몰에서 자동으로 수집·분석하고, 최저가 도달 시 사용자에게 알림을 보내는 가격 추적 서비스입니다.

---

## 목차

- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [사전 요구사항](#사전-요구사항)
- [빠른 시작](#빠른-시작)
- [환경 변수 설정](#환경-변수-설정)
- [데이터베이스 설정](#데이터베이스-설정)
- [개발 서버 실행](#개발-서버-실행)
- [서비스 사용 가이드](#서비스-사용-가이드)
- [크롤러 운영 가이드](#크롤러-운영-가이드)
- [주요 명령어](#주요-명령어)
- [API 엔드포인트](#api-엔드포인트)
- [아키텍처 개요](#아키텍처-개요)
- [프로덕션 배포](#프로덕션-배포)
- [트러블슈팅](#트러블슈팅)

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 모노레포 | Turborepo + pnpm workspaces |
| 백엔드 | NestJS (Node 20, TypeScript strict) |
| 프론트엔드 | Next.js 15 (App Router) |
| ORM | Drizzle ORM + drizzle-kit |
| 데이터베이스 | PostgreSQL 16 |
| 큐 | InMemoryQueue (기본) / Bull + Redis 7 (선택) |
| 크롤링 | Playwright (Chromium headless) |
| 로거 | nestjs-pino + pino-pretty |
| 환경 검증 | Zod |

---

## 프로젝트 구조

```
PCPriceTrack/
├── apps/
│   ├── api/                        # NestJS 백엔드 (포트 3001)
│   │   └── src/
│   │       ├── common/             # guards, filters, interceptors, pipes
│   │       ├── config/             # 환경변수 검증 (Zod), NestJS config
│   │       ├── database/
│   │       │   ├── migrations/     # 자동 생성 SQL 마이그레이션
│   │       │   ├── schema/         # Drizzle 테이블 정의
│   │       │   └── seeds/          # 초기 데이터 (stores, categories)
│   │       └── modules/
│   │           ├── auth/           # JWT 인증
│   │           ├── products/       # 상품 CRUD + 검색 + 특가
│   │           ├── alerts/         # 가격 알림 설정
│   │           ├── notifications/  # 알림 발송
│   │           └── crawler/        # 크롤링 모듈 (어댑터, 큐, 스케줄러)
│   └── web/                        # Next.js 프론트엔드 (포트 3000)
│       └── src/app/
│           ├── products/           # 제품 목록 (필터, 최저가, 특가 섹션)
│           ├── products/[slug]/    # 제품 상세 (가격 비교, 히스토리 차트)
│           └── deals/              # 특가/가격 하락 페이지
├── infra/
│   └── docker-compose.yml          # 개발용 (PostgreSQL + Redis)
└── .env.example
```

---

## 사전 요구사항

| 도구 | 버전 |
|------|------|
| Node.js | >= 20 |
| pnpm | >= 8 |
| Docker & Docker Compose | 최신 버전 |

```bash
# pnpm 설치 (없는 경우)
npm install -g pnpm@8

node -v   # v20.x.x 이상
docker -v
```

---

## 빠른 시작

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일을 열어 필요한 값 수정
```

### 3. 인프라(DB + Redis) 실행

```bash
cd infra
docker compose up -d
```

### 4. 데이터베이스 마이그레이션 및 시드

```bash
pnpm db:migrate   # 테이블 생성
pnpm db:seed      # stores + categories 초기 데이터 삽입
```

### 5. 개발 서버 실행

```bash
# 터미널 1: API 서버
pnpm --filter api dev

# 터미널 2: 웹 서버
pnpm --filter web dev
```

| 서비스 | URL |
|--------|-----|
| 웹 프론트엔드 | http://localhost:3000 |
| API 서버 | http://localhost:3001 |
| Drizzle Studio | http://localhost:4983 |

---

## 환경 변수 설정

`.env.example`을 복사한 뒤 각 값을 설정합니다.

```dotenv
# ── Application ──────────────────────────────
NODE_ENV=development
PORT=3001

# ── Database ─────────────────────────────────
DATABASE_URL=postgresql://pcpriceUser:password@localhost:5432/pcpricetrack

# ── Redis 큐 모드 ─────────────────────────────
# disabled(기본): 인메모리 큐 사용 — Redis 불필요
# local:          로컬 Redis 사용 (docker-compose)
# upstash:        Upstash 클라우드 Redis 사용
REDIS_MODE=disabled

# REDIS_MODE=local 또는 upstash 시 아래 값 필요
REDIS_HOST=localhost      # upstash: xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=           # upstash: 발급된 토큰
REDIS_TLS=false           # upstash: true

# ── Auth ─────────────────────────────────────
JWT_SECRET=              # 최소 32자 이상의 랜덤 문자열
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ── Email (Resend) ────────────────────────────
RESEND_API_KEY=re_xxxx   # https://resend.com 에서 발급
EMAIL_FROM=noreply@pcpricetrack.com
```

> **주의**: `JWT_SECRET`은 절대 공개 저장소에 커밋하지 마세요.

> **참고**: 비밀번호에 `!` 등 특수문자가 포함된 경우 URL 인코딩 필요 (`!` → `%21`)

---

## 데이터베이스 설정

### 스키마 구조

```
stores            상점 정보 (Amazon, Newegg 등)
categories        카테고리 (CPU, GPU, RAM, SSD 등)
products          상품 (상점 독립적, imageUrl 포함)
product_listings  상품 × 상점 매핑 (UNIQUE: store_id + external_id)
price_records     가격 이력 (append-only, INSERT만 사용)
users             사용자
alerts            가격 알림 설정
notifications     발송된 알림 이력
crawl_jobs        크롤링 작업 이력
```

### 마이그레이션 워크플로우

```bash
pnpm db:generate   # 스키마 변경 → SQL 파일 생성
pnpm db:migrate    # DB에 마이그레이션 적용
pnpm db:seed       # 초기 데이터 삽입 (최초 1회)
pnpm db:studio     # Drizzle Studio GUI (http://localhost:4983)
```

---

## 개발 서버 실행

### 인프라 (PostgreSQL + Redis)

```bash
cd infra

docker compose up -d      # 시작
docker compose down       # 중지
docker compose down -v    # 데이터 포함 완전 삭제
docker compose logs -f    # 로그 확인
```

### 직접 psql 접속

```bash
# 비밀번호에 특수문자가 있는 경우 URL 인코딩 사용
psql "postgresql://pcpriceUser:p%40ssword@localhost:5432/pcpricetrack"
```

---

## 서비스 사용 가이드

### 1. 회원가입 및 관리자 권한 설정

```bash
# 회원가입
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123","name":"Admin"}'

# 로그인 → accessToken 저장
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

관리자 API 사용을 위해 DB에서 role을 변경합니다:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

### 2. 크롤러로 제품 데이터 수집

서비스를 처음 시작하면 제품 데이터가 없습니다. 크롤러 Discovery로 Amazon·Newegg에서 제품을 자동 수집합니다.

```bash
TOKEN="로그인_후_받은_accessToken"

# 전체 스토어 × 전체 카테고리 실행 (권장)
curl -X POST http://localhost:3001/api/admin/crawler/trigger/all \
  -H "Authorization: Bearer $TOKEN"
```

수집 항목: 제품명, 브랜드, 가격, 재고 여부, 썸네일 이미지

### 3. 웹 UI 기능 안내

| 페이지 | URL | 주요 기능 |
|--------|-----|-----------|
| 제품 목록 | http://localhost:3000/products | 카테고리·가격 필터, 최저가 표시, 상단 특가 섹션 |
| 제품 상세 | http://localhost:3000/products/:slug | 스토어별 가격 비교, 30일 가격 히스토리 차트 |
| 특가 | http://localhost:3000/deals | 가격 하락률 순위 (하락폭 클수록 상단 노출) |

### 4. 가격 알림 설정

목표 가격 이하로 떨어지면 이메일 알림을 받을 수 있습니다.

```bash
curl -X POST http://localhost:3001/api/alerts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":"상품_UUID","targetPrice":299.99}'
```

---

## 크롤러 운영 가이드

### 자동 스케줄

별도 설정 없이 자동으로 실행됩니다:

| 카테고리 | 주기 |
|----------|------|
| GPU, CPU | 30분마다 |
| RAM, SSD | 2시간마다 |
| 전체 Discovery (신규 제품 수집) | 매일 새벽 2시 |

### 수동 실행

```bash
TOKEN="accessToken"

# 전체 크롤링 (가격 갱신 + 신규 제품 Discovery)
curl -X POST http://localhost:3001/api/admin/crawler/trigger/all \
  -H "Authorization: Bearer $TOKEN"

# 카테고리별 Discovery (신규 제품 + 이미지 수집)
curl -X POST http://localhost:3001/api/admin/crawler/trigger/discovery \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"storeId":"스토어_UUID","categorySlug":"gpu"}'
```

`categorySlug` 옵션: `gpu` `cpu` `ram` `ssd` `motherboard`

### 상태 및 storeId 확인

```bash
# storeId 포함 전체 상태 확인
curl http://localhost:3001/api/admin/crawler/status \
  -H "Authorization: Bearer $TOKEN"

# 최근 작업 목록
curl http://localhost:3001/api/admin/crawler/jobs \
  -H "Authorization: Bearer $TOKEN"
```

### 서킷 브레이커

| 상태 | 조건 |
|------|------|
| CLOSED | 정상 동작 |
| OPEN | 10분 내 10회 실패 → 크롤링 차단 |
| HALF_OPEN | 5분 후 자동 전환 → 3회 성공 시 CLOSED 복귀 |

---

## Redis 큐 모드 변경 가이드

크롤링 작업 큐의 구현체를 `.env`의 `REDIS_MODE` 값 하나로 전환할 수 있습니다.

### 모드 비교

| 모드 | 구현체 | Redis 필요 | 서버 재시작 시 작업 유지 | 사용 상황 |
|------|--------|-----------|------------------------|-----------|
| `disabled` | InMemoryQueue | ❌ | ❌ 초기화됨 | 기본값, Render 무료 플랜 |
| `local` | Bull + Redis | ✅ localhost | ✅ 유지됨 | 로컬 개발 (docker-compose) |
| `upstash` | Bull + Redis | ✅ Upstash | ✅ 유지됨 | 클라우드 (월 50만 건 무료) |

### disabled → local (로컬 Redis)

```bash
# 1. Redis 컨테이너 실행
cd infra && docker compose up -d

# 2. .env 수정
REDIS_MODE=local
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=       # 비워두기
REDIS_TLS=false

# 3. API 재시작
pnpm --filter api dev
```

### disabled → upstash (Upstash 클라우드)

```bash
# 1. upstash.com → Create Database → Region: ap-northeast-1 (Tokyo)
# 2. Details 탭에서 Endpoint / Port / Password(토큰) 확인

# 3. .env 수정
REDIS_MODE=upstash
REDIS_HOST=rested-macaque-xxxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=Upstash_발급_토큰
REDIS_TLS=true

# 4. API 재시작
pnpm --filter api dev
```

### Render 환경변수 설정

Render 대시보드 → Environment 탭에서 `REDIS_MODE`를 추가합니다.

```env
# 기본값 — Redis 불필요 (Upstash 500k 한도 초과 방지)
REDIS_MODE=disabled

# Upstash 사용 시
REDIS_MODE=upstash
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=토큰값
REDIS_TLS=true
```

> **Upstash 무료 한도**: 월 500,000 명령. Bull 큐는 작업당 수십 건의 Redis 명령을 소비하므로
> 크롤링 빈도가 높으면 한도를 초과할 수 있습니다. 이 경우 `REDIS_MODE=disabled`로 전환하세요.

---

## 주요 명령어

```bash
# ── 개발 ──────────────────────────────────────
pnpm --filter api dev       # API 개발 서버 (포트 3001)
pnpm --filter web dev       # 웹 개발 서버 (포트 3000)

# ── 빌드 ──────────────────────────────────────
pnpm --filter api build
pnpm --filter web build

# ── 데이터베이스 ───────────────────────────────
pnpm db:generate            # 스키마 변경 → SQL 생성
pnpm db:migrate             # 마이그레이션 실행
pnpm db:seed                # 초기 데이터 삽입
pnpm db:studio              # Drizzle Studio 실행

# ── 인프라 ────────────────────────────────────
cd infra && docker compose up -d
cd infra && docker compose down
```

---

## API 엔드포인트

### 인증

```
POST   /api/auth/register       회원가입
POST   /api/auth/login          로그인 (JWT 발급)
POST   /api/auth/refresh        토큰 갱신
POST   /api/auth/logout         로그아웃
```

### 상품

```
GET    /api/products                     상품 목록
         ?search=      텍스트 검색
         ?categoryId=  카테고리 UUID 필터
         ?minPrice=    최소 가격
         ?maxPrice=    최대 가격
         ?page=        페이지 번호 (기본 1)
         ?limit=       페이지 크기 (기본 20, 최대 100)

GET    /api/products/deals?limit=20      가격 하락 특가 목록 (하락률 순)
GET    /api/products/:slug               상품 상세 + 스토어별 현재 가격
GET    /api/products/:slug/price-history 가격 히스토리
         ?days=30
```

### 카테고리

```
GET    /api/categories          카테고리 목록
```

### 알림 (인증 필요)

```
GET    /api/alerts              내 알림 목록
POST   /api/alerts              알림 생성 { productId, targetPrice }
PATCH  /api/alerts/:id          알림 수정
DELETE /api/alerts/:id          알림 삭제
```

### 관리자 (admin role 필요)

```
GET    /api/admin/crawler/status               크롤러 상태 + storeId 목록
GET    /api/admin/crawler/jobs                 작업 이력
POST   /api/admin/crawler/trigger/all          전체 크롤링
POST   /api/admin/crawler/trigger/store        특정 스토어 크롤링
POST   /api/admin/crawler/trigger/discovery    카테고리 Discovery
```

---

## 아키텍처 개요

```
┌─────────────────────────────────────────┐
│       Next.js Web (:3000)               │
│  Products │ Deals │ Alerts │ Auth       │
└──────────────────┬──────────────────────┘
                   │ HTTP
┌──────────────────▼──────────────────────┐
│         NestJS API (:3001)              │
│  Auth │ Products │ Alerts │ Admin       │
└──────────┬───────────────┬──────────────┘
           │               │
      PostgreSQL          Redis
      (데이터 저장)    (Bull 큐 + 서킷 브레이커)
                           │
                   ┌───────▼────────┐
                   │  Crawler       │
                   │  (Playwright)  │
                   │  Amazon/Newegg │
                   └────────────────┘
```

### 크롤러 동작 방식

- **Discovery**: 카테고리 페이지 → URL 수집 → 상품 스크래핑 → 제품·가격·이미지 DB 저장
- **Full Store**: 기존 `product_listings` URL 재크롤 → 가격 갱신
- **가격 저장**: append-only (`price_records`는 INSERT만, UPDATE 없음)
- **중복 제거**: `product_listings.UNIQUE(store_id, external_id)`

---

## 프로덕션 배포

### 아키텍처

```
Vercel (Next.js)
  → Render (NestJS API)
      → Supabase (PostgreSQL)
      → InMemoryQueue (REDIS_MODE=disabled, 기본값)

로컬 노트북 (크롤러만 실행)
  → Supabase (PostgreSQL) 직접 연결
  → 필요 시 로컬 Redis 또는 Upstash 전환 가능
```

> **핵심**: Playwright 크롤러는 무거워서 Render 무료 플랜에서 실행 불가.
> 크롤러는 로컬에서 실행하고 데이터는 Supabase에 저장. Render API는 데이터 서빙만 담당.

---

### 1. Supabase (PostgreSQL) 설정

1. [supabase.com](https://supabase.com) → GitHub 로그인 → **New Project** 생성
2. **Settings → Database → Connect → Transaction pooler** 선택
3. **Use IPv4 connection (Shared Pooler)** 토글 ON
4. URI 복사 (포트 6543):
   ```
   postgresql://postgres.[project-id]:[password]@aws-1-xx.pooler.supabase.com:6543/postgres
   ```

> **주의**: Direct connection(포트 5432)은 IPv6 전용이라 Render에서 `ENETUNREACH` 에러 발생.
> 반드시 Transaction pooler(포트 6543) + IPv4 옵션 사용.

### 2. Upstash (Redis) 설정

1. [upstash.com](https://upstash.com) → GitHub 로그인
2. **Create Database** → Region: `ap-northeast-1 (Tokyo)`
3. Details 탭에서 Endpoint, Port(6379), Token(비밀번호) 확인
4. TLS/SSL: Enabled → `REDIS_TLS=true` 환경변수 필요

### 3. Render (NestJS API) 배포

1. [render.com](https://render.com) → GitHub 로그인
2. **New → Web Service** → `PCPriceTrack` 레포 선택
3. 설정:
   ```
   Root Directory: apps/api
   Build Command:  pnpm install --prod=false && pnpm build
   Start Command:  node dist/main
   ```
4. 환경변수 설정 (Environment 탭):
   ```env
   NODE_ENV=production
   DATABASE_URL=postgresql://postgres.[id]:[pw]@aws-1-xx.pooler.supabase.com:6543/postgres
   POSTGRES_HOST=aws-1-xx.pooler.supabase.com
   POSTGRES_PORT=6543
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=Supabase비밀번호
   POSTGRES_DB=postgres
   REDIS_MODE=disabled        # Redis 불필요 (인메모리 큐 사용)
   # REDIS_MODE=upstash       # Upstash 사용 시 아래 항목도 함께 설정
   # REDIS_HOST=xxx.upstash.io
   # REDIS_PORT=6379
   # REDIS_PASSWORD=Upstash토큰
   # REDIS_TLS=true
   JWT_SECRET=openssl rand -base64 48 결과값
   JWT_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   FRONTEND_URL=https://your-app.vercel.app
   CRAWLER_CONCURRENCY=2
   ```

> **참고**: 앱 시작 시 `main.ts`에서 DB 마이그레이션이 자동 실행됨 (Render 무료 플랜은 Shell 접근 불가).

### 4. DB 시드 (최초 1회)

로컬에서 Supabase를 타겟으로 시드 실행:

```bash
DATABASE_URL="postgresql://postgres.[id]:[pw]@aws-1-xx.pooler.supabase.com:6543/postgres" \
POSTGRES_HOST="aws-1-xx.pooler.supabase.com" \
POSTGRES_PORT="6543" \
POSTGRES_USER="postgres" \
POSTGRES_PASSWORD="비밀번호" \
POSTGRES_DB="postgres" \
pnpm db:seed
```

### 5. Vercel (Next.js) 배포

1. [vercel.com](https://vercel.com) → GitHub 연동
2. **Environment Variables** 설정:
   ```
   NEXT_PUBLIC_API_URL=https://pcpricetrack.onrender.com/api
   ```
3. 재배포 후 동작 확인

### 6. 크롤러 운영 (로컬)

로컬 `.env`를 Supabase로 변경 후 API 서버 실행:

```bash
# .env에서 DATABASE_URL 등을 Supabase 값으로 변경
pnpm dev

# 크롤링 트리거
curl -X POST http://localhost:3001/api/admin/crawler/trigger/all
```

---

### 헬스체크

```bash
curl https://pcpricetrack.onrender.com/api/health
# {"status":"ok","timestamp":"..."}
```

---

### 배포 시 겪은 주요 이슈

| 이슈 | 원인 | 해결 |
|------|------|------|
| `ENETUNREACH` DB 연결 실패 | Supabase Direct connection은 IPv6 전용 | Transaction pooler(포트 6543) + IPv4 토글 ON |
| `nest: not found` 빌드 실패 | `@nestjs/cli`가 devDependencies라 production 빌드에서 누락 | Build Command에 `--prod=false` 추가 |
| `Can't find meta/_journal.json` | 빌드 시 migrations 폴더가 dist에 복사 안됨 | `nest-cli.json`에 assets 설정 추가 |
| `relation "stores" does not exist` | 새 DB에 마이그레이션 미실행 | `main.ts`에서 시작 시 자동 마이그레이션 실행 |
| Render Shell 접근 불가 | 무료 플랜 미지원 | `main.ts` bootstrap 전 마이그레이션 자동 실행으로 해결 |
| Oracle A1.Flex Out of capacity | 한국 리전(ap-chuncheon-1) 재고 부족 | 새벽~아침 시간대 재시도 또는 다른 리전 선택 |
| Railway PostgreSQL 생성 실패 | 무료 플랜 카드 등록 필요 | Supabase(무료) + Upstash(무료) 조합으로 대체 |

---

## 트러블슈팅

### 제품 목록이 비어있을 때

크롤러 Discovery를 실행하여 제품을 수집합니다:

```bash
curl -X POST http://localhost:3001/api/admin/crawler/trigger/all \
  -H "Authorization: Bearer $TOKEN"
```

### 403 Forbidden (관리자 API 접근 불가)

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

### 비밀번호 특수문자로 psql 접속 실패

```bash
# '!' → '%21' 등 URL 인코딩 사용
psql "postgresql://user:p%40ss%21word@localhost:5432/dbname"
```

### Docker 컨테이너가 시작되지 않을 때

```bash
lsof -i :5432    # PostgreSQL 포트 충돌 확인
lsof -i :6379    # Redis 포트 충돌 확인

cd infra && docker compose logs postgres
```

### Playwright 브라우저 미설치

```bash
pnpm --filter api exec playwright install chromium
```

### Next.js 캐시 오류 (MODULE_NOT_FOUND)

```bash
rm -rf apps/web/.next
pnpm --filter web dev
```
