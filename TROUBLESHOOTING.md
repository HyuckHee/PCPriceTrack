# PCPriceTrack 트러블슈팅 가이드

배포 및 개발 과정에서 겪은 이슈들과 해결 방법 모음

---

## 목차

1. [로컬 개발 이슈](#로컬-개발-이슈)
2. [Oracle Cloud 이슈](#oracle-cloud-이슈)
3. [Railway 이슈](#railway-이슈)
4. [Render 배포 이슈](#render-배포-이슈)
5. [Supabase 이슈](#supabase-이슈)
6. [Upstash Redis 이슈](#upstash-redis-이슈)
7. [NestJS 이슈](#nestjs-이슈)

---

## 로컬 개발 이슈

### 포트 충돌 (EADDRINUSE)

**증상**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**원인**: 이전 서버 프로세스가 종료되지 않고 남아있음

**해결**
```bash
lsof -ti :3001 | xargs kill -9
```

---

### NestJS 핫리로딩 미적용

**증상**: 코드 수정 후에도 이전 코드가 실행됨

**원인**: 여러 개의 NestJS 프로세스가 동시에 실행 중

**해결**
```bash
pkill -f "nest.*start.*watch"
pkill -f "pnpm.*api.*dev"
# 이후 재시작
pnpm dev
```

---

### IS_DEMO 플래그로 API 호출 차단

**증상**: `NEXT_PUBLIC_API_URL`이 localhost인데 API 호출이 안 됨

**원인**: `apiUrl.includes('localhost')` 조건으로 IS_DEMO=true가 되어 fetch 함수들이 null 반환

**해결**: 빌드 견적 관련 fetch 함수들에서 `if (IS_DEMO) return null;` 가드 제거

---

### forbidNonWhitelisted 400 오류

**증상**
```
400 Bad Request — budgetAllocation: property should not exist
```

**원인**: `ValidationPipe`에 `forbidNonWhitelisted: true` 설정 시, DTO에 없는 필드가 들어오면 거부

**해결**: DTO에 해당 필드 추가
```typescript
@IsOptional()
@IsNumber()
budgetAllocation?: number;
```

---

## Oracle Cloud 이슈

### A1.Flex Out of Capacity

**증상**
```
Out of capacity for shape VM.Standard.A1.Flex in availability domain AD-1
```

**원인**: 해당 리전/가용 도메인에 ARM 인스턴스 재고 없음

**해결 방법**
- Fault Domain을 바꿔서 재시도 (AD-1 → FD-2, FD-3)
- "Create instance without specifying a fault domain" 체크 후 재시도
- 새벽~아침 시간대(한국 기준 06:00~09:00)에 재고 풀릴 때 재시도
- 다른 리전 구독 후 시도 (us-ashburn-1 추천)

---

### 리전 추가 불가

**증상**
```
You have exceeded the maximum number of regions allowed for your tenancy.
```

**원인**: 무료 계정은 구독 가능한 리전 수 제한 있음

**해결**: 현재 리전(ap-chuncheon-1)에서 계속 재시도하거나 다른 배포 플랫폼 사용

---

### CIDR 충돌

**증상**
```
The requested CIDR 10.0.0.0/24 is invalid: overlaps with existing subnet
```

**원인**: VM 생성 실패 시에도 VCN/서브넷이 이미 생성되어 같은 CIDR 재사용 불가

**해결**: CIDR을 순차적으로 변경해서 시도
```
10.0.0.0/24 → 10.0.1.0/24 → 10.0.2.0/24
```

---

### VCN 개수 초과

**증상**
```
The following service limits were exceeded: vcn-count
```

**원인**: VM 생성 반복 실패로 VCN이 계속 쌓임

**해결**: Oracle 콘솔 → Networking → Virtual Cloud Networks → 불필요한 VCN 삭제

---

### Public IP 토글 비활성화

**증상**: "Automatically assign public IPv4 address" 토글이 클릭 안 됨

**원인**: Public Subnet이 선택되지 않은 상태

**해결**: Networking → Primary network → "Create new virtual cloud network" 선택 → Subnet에서 "Create new public subnet" 확인 후 토글 활성화됨

---

## Railway 이슈

### PostgreSQL 생성 실패

**증상**: `Failed to deploy PostgreSQL`

**원인**: Railway 무료 플랜에서 DB 생성 시 신용카드 등록 필요

**해결**: Supabase(무료 PostgreSQL) + Upstash(무료 Redis) 조합으로 대체

---

### 환경변수 참조 오류

**증상**: `DATABASE_URL: String must contain at least 1 character(s)`

**원인**: `${{Postgres.DATABASE_URL}}` 참조 문법에서 서비스 이름이 맞지 않음

**해결**: Railway PostgreSQL 서비스 → Variables 탭에서 실제 값을 직접 복사해서 입력

---

## Render 배포 이슈

### nest: not found 빌드 실패

**증상**
```
sh: 1: nest: not found
ELIFECYCLE Command failed.
```

**원인**: `@nestjs/cli`가 devDependencies라 `NODE_ENV=production` 빌드 시 설치 안 됨

**해결**: Render Build Command 변경
```
pnpm install --prod=false && pnpm build
```

---

### migrations 파일 없음

**증상**
```
Error: Can't find meta/_journal.json file
```

**원인**: NestJS 빌드 시 `.ts` 파일만 컴파일되고, `migrations/` 폴더의 `.sql` 파일은 `dist/`에 복사 안 됨

**해결**: `nest-cli.json`에 assets 설정 추가
```json
{
  "compilerOptions": {
    "assets": [
      { "include": "database/migrations/**/*", "outDir": "dist" }
    ]
  }
}
```

---

### Shell 접근 불가

**증상**: Render Shell 탭 클릭 시 유료 업그레이드 팝업

**원인**: 무료 플랜에서 Shell 미지원

**해결**: `main.ts` bootstrap 전에 마이그레이션 자동 실행
```typescript
async function runMigrations() {
  // 앱 시작 전 자동 마이그레이션
}

async function bootstrap() {
  await runMigrations();
  // ...
}
```

---

### 포트 바인딩 오류

**증상**
```
No open ports detected. Bind your service to at least one port.
```

**원인**: Render는 `PORT` 환경변수로 동적 포트 할당 (기본 10000)

**해결**: `main.ts`에서 PORT 환경변수 사용
```typescript
const port = config.get<number>('port') ?? 3001;
await app.listen(port);
```

---

## Supabase 이슈

### IPv6 연결 오류 (ENETUNREACH)

**증상**
```
Error: connect ENETUNREACH 2406:da12:xxx:5432
```

**원인**: Supabase Direct connection(포트 5432)은 IPv6 전용이라 Render/Railway 등 일부 플랫폼에서 접근 불가

**해결**: Transaction Pooler(IPv4) 사용
- Supabase → Settings → Database → Connect → Transaction pooler 선택
- **"Use IPv4 connection (Shared Pooler)"** 토글 ON
- 포트 6543 URL 사용:
```
postgresql://postgres.[project-id]:[pw]@aws-1-xx.pooler.supabase.com:6543/postgres
```

---

### relation does not exist

**증상**
```
error: relation "stores" does not exist
```

**원인**: 새 Supabase DB에 마이그레이션이 실행되지 않아 테이블 없음

**해결 1**: 로컬에서 시드 실행
```bash
DATABASE_URL="postgresql://..." pnpm db:seed
```

**해결 2**: `main.ts`에서 앱 시작 시 자동 마이그레이션 실행

---

## Upstash Redis 이슈

### ECONNRESET

**증상**
```
[ioredis] Unhandled error event: Error: read ECONNRESET
```

**원인**: Upstash Redis는 TLS(SSL) 필수인데 ioredis 연결 시 TLS 설정 없음

**해결**: `.env`에 `REDIS_TLS=true` 추가 후 ioredis 및 Bull 설정에 TLS 적용
```typescript
// app.module.ts
redis: {
  tls: config.get<boolean>('redis.tls') ? { rejectUnauthorized: false } : undefined,
}

// circuit-breaker.service.ts
new Redis({
  tls: this.config.get<boolean>('redis.tls') ? { rejectUnauthorized: false } : undefined,
})
```

---

## NestJS 이슈

### 크롤러 관리자 API 401

**증상**: 올바른 JWT 토큰으로 `/api/admin/crawler` 호출 시 401

**원인 1**: `Authorization: Bearer 토큰` 형식에서 `Bearer` 뒤 공백 누락
```bash
# 틀린 형식
-H "Authorization:eyJhbG..."

# 올바른 형식
-H "Authorization: Bearer eyJhbG..."
```

**원인 2**: DB에서 role을 admin으로 변경했지만 이전 토큰 사용 중

**해결**: role 변경 후 반드시 재로그인하여 새 토큰 발급

---

### 관리자 API 403

**증상**: JWT 인증은 통과하나 403 Forbidden

**원인**: users 테이블의 role이 `admin`이 아님

**해결**: Supabase SQL Editor에서 직접 변경
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```
이후 재로그인하여 새 토큰 사용

---

### SSR 하이드레이션 불일치

**증상**: 콘솔에 hydration mismatch 경고, 드래그 패널 위치 오류

**원인**: `window.innerWidth` 같은 브라우저 API를 SSR 시 사용하면 서버/클라이언트 값 다름

**해결**: 초기값을 정적으로 설정하고 `useEffect`에서 실제 값으로 업데이트
```typescript
const [pos, setPos] = useState({ x: 0, y: 80 }); // 정적 초기값

useEffect(() => {
  setPos(getDefaultPos()); // 마운트 후 실제 위치 설정
}, []);
```
