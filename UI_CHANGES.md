# UI 변경 로그

프론트엔드(Next.js) 화면 관련 변경 이력을 기록합니다.

---

## 2026-04-02

### [1] shadcn/ui 도입
- **추가 컴포넌트**: `Badge`, `Button`, `Tabs`, `Skeleton`
- **위치**: `apps/web/src/components/ui/`
- **사유**: 일관된 디자인 시스템 적용
- **커밋**: `ec4d722`

### [2] Sonner 토스트 알림 도입
- **패키지**: `sonner`
- **변경 파일**: `apps/web/src/app/layout.tsx`, `apps/web/src/app/login/page.tsx`
- **적용 위치**:
  - 로그인 성공/실패 토스트
  - 회원가입 성공/실패 토스트
  - 견적 버튼 클릭 시 미로그인 안내
- **커밋**: `ede6dd3`, `5a4f1d8`

### [3] nuqs 도입 — 필터 URL 동기화
- **패키지**: `nuqs`
- **신규 파일**: `apps/web/src/components/ProductFilters.tsx`
- **변경 파일**: `apps/web/src/app/layout.tsx` (`NuqsAdapter` 추가)
- **기능**: 카테고리·브랜드·가격 필터 상태를 URL 쿼리스트링으로 관리
- **특이사항**: `setParams` Promise 타입 충돌 → `void setParams()` 패턴으로 해결
- **커밋**: `0fc7fb3`

### [4] TanStack Query 도입
- **패키지**: `@tanstack/react-query`
- **신규 파일**: `apps/web/src/components/QueryProvider.tsx`
- **변경 파일**:
  - `apps/web/src/app/layout.tsx` (`QueryProvider` 래퍼 추가)
  - `apps/web/src/app/alerts/page.tsx` (useState → useQuery/useMutation 리팩토링)
- **설정**: `staleTime: 60s`, `retry: 1`
- **커밋**: `264aad2`

### [5] layout.tsx 래퍼 구조
- **파일**: `apps/web/src/app/layout.tsx`
- **현재 래퍼 순서**:
  ```tsx
  <QueryProvider>
    <NuqsAdapter>
      <CurrencyProvider>
        <BuildEstimatorProvider>
          ...
        </BuildEstimatorProvider>
      </CurrencyProvider>
    </NuqsAdapter>
  </QueryProvider>
  ```

### [6] next.config.mjs ESLint 빌드 오류 수정
- **파일**: `apps/web/next.config.mjs`
- **변경 내용**: `eslint: { ignoreDuringBuilds: true }` 추가
- **사유**: Vercel 빌드 시 `eslint/config` 서브패스 오류 발생
- **커밋**: `1f9935c`

### [7] 카카오 + Google 소셜 로그인 버튼 추가
- **파일**: `apps/web/src/app/login/page.tsx`
- **변경 내용**:
  - 카카오 로그인 버튼 (노란색)
  - 구글 로그인 버튼 (흰색)
  - `NEXT_PUBLIC_API_URL` 기반 OAuth 시작 URL 생성
- **커밋**: `be1177a`

### [8] AuthContext 전역 로그인 상태 관리
- **신규 파일**: `apps/web/src/context/AuthContext.tsx`
- **제공 값**: `user`, `login()`, `logout()`, `isLoading`
- **변경 파일**: `apps/web/src/app/layout.tsx` (AuthProvider 추가)
- **커밋**: `dd97350`

### [9] auth/callback 페이지 Suspense 처리
- **파일**: `apps/web/src/app/auth/callback/page.tsx`
- **변경 내용**: `useSearchParams()` → `<Suspense>` 경계 내부로 이동
- **사유**: Next.js 15 빌드 오류 (`missing-suspense-with-csr-bailout`)
- **추가**: `AuthContext.login()` 호출로 전역 상태 즉시 반영
- **커밋**: `6523d8f`

### [10] 로그아웃 확인 모달 추가
- **파일**: `apps/web/src/components/AuthNav.tsx`
- **기능**:
  - 로그아웃 클릭 시 확인 모달 표시
  - "카카오 로그인 정보를 완전히 제거합니다" 체크박스
  - 체크 시 `GET /api/auth/kakao/logout` → 카카오 세션 완전 제거
  - 미체크 시 localStorage 토큰만 삭제
- **커밋**: `bd33b0c`

### [11] Vercel 환경변수 설정
```
NEXT_PUBLIC_API_URL=https://pcpricetrack.onrender.com/api
```
- **주의**: 초기 설정 시 `/api` 미포함으로 `Cannot GET /auth/kakao` 오류 발생 → 수정

### [12] 견적 저장/조회 토큰 전달 수정 (버그 수정)
- **파일**: `apps/web/src/lib/data.ts`
- **문제**: `saveBuild()`, `fetchSavedBuilds()` 호출 시 JWT 토큰 미전달 → 백엔드 인증 실패
- **변경 내용**: `localStorage.getItem('token')` 으로 토큰 읽어 API 호출에 포함
- **커밋**: `666a9b9`

### [13] auth/callback 페이지 AuthContext 연동
- **파일**: `apps/web/src/app/auth/callback/page.tsx`
- **변경 내용**:
  - `AuthCallbackInner` 컴포넌트 분리 + `<Suspense>` 래핑
  - `useAuth().login(token)` 호출로 전역 인증 상태 즉시 반영
- **커밋**: 자동 수정

### [14] 견적 상세 사이드바 구현
- **신규 파일**:
  - `apps/web/src/context/BuildDetailSidebarContext.tsx` — 선택된 견적 전역 상태
  - `apps/web/src/components/BuildDetailSidebar.tsx` — 우측 슬라이드 사이드바
- **변경 파일**:
  - `apps/web/src/app/layout.tsx` — `BuildDetailSidebarProvider`, `BuildDetailSidebar` 추가
  - `apps/web/src/components/BuildEstimatorPanel.tsx` — 저장된 견적에 "상세보기 →" 버튼 추가
- **사이드바 기능**: 부품 카드(이미지·가격·쇼핑몰 링크), 예산/총액, 삭제 버튼
- **커밋**: `93c291c`

---
