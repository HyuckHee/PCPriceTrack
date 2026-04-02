# 서버 변경 로그

백엔드(NestJS API), 인프라, 배포 관련 변경 이력을 기록합니다.

---

## 2026-04-02

### [1] 프로덕션 배포 환경 구성
- **플랫폼**: Render (API) + Supabase (PostgreSQL) + Upstash (Redis)
- **시도한 플랫폼**: ngrok(실패) → Oracle Cloud A1.Flex(용량 부족) → Railway(카드 필요) → 현재 구성
- **Render URL**: `https://pcpricetrack.onrender.com`
- **주의**: 초기 설정 시 `https://pc-price-track-api.onrender.com` 으로 잘못 입력하여 OAuth 등 오류 발생 → 올바른 URL로 수정

### [2] 환경변수 설정 (Render)
```
NODE_ENV=production
DATABASE_URL=postgresql://...@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
REDIS_URL=rediss://...@...upstash.io:6379
REDIS_TLS=true
JWT_SECRET=...
JWT_REFRESH_SECRET=...
FRONTEND_URL=https://pc-price-track-web.vercel.app
API_URL=https://pcpricetrack.onrender.com
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### [3] DB 마이그레이션 자동 실행 (main.ts)
- **파일**: `apps/api/src/main.ts`
- **변경 내용**: 앱 부트스트랩 시 `runMigrations()` 자동 실행
- **사유**: Render 배포 후 수동 마이그레이션 없이 자동 적용
- **커밋**: `26b757c`

### [4] Supabase IPv4 연결 설정
- **문제**: Render → Supabase 직접 연결 시 IPv6 전용으로 `ENETUNREACH` 오류
- **해결**: Connection Pooler URL 사용 (포트 6543, IPv4 지원)
- ```
  postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
  ```

### [5] Upstash Redis TLS 연결
- **파일**: `apps/api/src/modules/crawler/services/circuit-breaker.service.ts` 등
- **변경 내용**: `REDIS_TLS=true` 환경변수로 TLS 연결 활성화
- **사유**: Upstash는 TLS 필수, 미설정 시 `ECONNRESET` 오류
- **커밋**: `e65b588`

### [6] 빌드 시 migrations 폴더 dist 포함
- **파일**: `apps/api/Dockerfile`, `nest-cli.json`
- **변경 내용**: `dist/database/migrations` 경로에 SQL 파일 복사
- **사유**: 런타임에 마이그레이션 파일 찾지 못하는 오류 수정
- **커밋**: `6f181d2`

### [7] CORS 설정 변경 (다중 수정)
- **파일**: `apps/api/src/main.ts`
- **변경 이력**:
  1. `FRONTEND_URL` 문자열 → OPTIONS 500 오류
  2. 콜백 `cb(new Error(), false)` → OPTIONS 500 오류
  3. 콜백 `cb(null, false)` → OPTIONS 404 오류
  4. `origin: true` → 동작하나 보안 취약
  5. **현재**: `origin: process.env.FRONTEND_URL ?? true` ✓
- **커밋**: `899534c`, `5ab6a82`, `15babda`

### [8] 카카오 + Google OAuth 소셜 로그인 추가
- **신규 파일**:
  - `apps/api/src/modules/auth/strategies/kakao.strategy.ts`
  - `apps/api/src/modules/auth/strategies/google.strategy.ts`
- **변경 파일**: `apps/api/src/modules/auth/auth.controller.ts`
- **추가 패키지**: `passport-kakao`, `passport-google-oauth20`
- **엔드포인트**:
  - `GET /api/auth/kakao` — 카카오 로그인 시작
  - `GET /api/auth/kakao/callback` — 카카오 콜백
  - `GET /api/auth/kakao/logout` — 카카오 세션 완전 제거
  - `GET /api/auth/google` — 구글 로그인 시작
  - `GET /api/auth/google/callback` — 구글 콜백
- **커밋**: `be1177a`, `bd33b0c`

### [9] 카카오 콘솔 Redirect URI 설정
- **등록 URI**: `https://pcpricetrack.onrender.com/api/auth/kakao/callback`
- **주의**: 초기에 잘못된 URL(`pc-price-track-api.onrender.com`) 등록으로 KOE006 오류 발생

### [10] product_listings.url varchar → text 변경
- **마이그레이션**: `0004_fluffy_cassandra_nova.sql`
- **사유**: URL 1000자 초과 시 크롤링 저장 실패
- **커밋**: `fd5185c`

### [11] 11번가 어댑터 상품명 오염 수정
- **파일**: `apps/api/src/modules/crawler/adapters/elevenst.adapter.ts`
- **문제**: 찜/공유 팝업 텍스트가 상품명에 포함되어 저장됨
- **해결**: `UI_NOISE` 정규식으로 잡음 제거 + 팝업 컨테이너 제외 셀렉터 우선 적용
- **커밋**: `d24451f`

### [12] UptimeRobot 설정
- **목적**: Render 무료 플랜 슬립(15분) 방지
- **핑 URL**: `https://pcpricetrack.onrender.com/api/health`
- **주기**: 5분마다

---
