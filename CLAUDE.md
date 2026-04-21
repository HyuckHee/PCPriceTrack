# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 소통 규칙

- 사용자와의 대화는 항상 한국어로 진행
- 사용자에게 질문할 때도 반드시 한국어로 질문
- 코드 주석도 한국어로 작성

## Commands

```bash
# Development (from root)
pnpm dev                     # Start all apps (web :3000, api :3001)
pnpm build                   # Build all apps
pnpm lint                    # Lint all apps
pnpm test                    # Run all tests

# Run single app
pnpm --filter api dev        # NestJS watch mode
pnpm --filter web dev        # Next.js dev server

# Run single test file (api)
pnpm --filter api test -- --testPathPattern=<pattern>

# Database
pnpm db:generate             # Generate SQL from schema changes (drizzle-kit)
pnpm db:migrate              # Run migrations (tsx src/database/migrate.ts)
pnpm db:seed                 # Seed stores + categories
pnpm db:studio               # Drizzle Studio GUI on :4983

# Infrastructure (requires Docker)
cd infra && docker compose up -d   # Start PostgreSQL :5432 + Redis :6379
```

## Architecture

Turborepo + pnpm monorepo with two apps:

- **apps/api** — NestJS 10 backend (TypeScript strict, `@/*` → `src/*`)
- **apps/web** — Next.js 15 frontend (App Router, React 19, `@/*` → `src/*`)
- **packages/** — `crawler/` and `shared/` exist but are empty placeholders

### API (apps/api)

NestJS with global prefix `/api`. All routes require JWT auth unless decorated with `@Public()`.

**Global middleware chain:** ValidationPipe (whitelist + forbidNonWhitelisted + transform) → JwtAuthGuard → RolesGuard → HttpExceptionFilter

**Key decorators:** `@CurrentUser()`, `@Public()`, `@Role('admin')`

**Database:** Drizzle ORM + PostgreSQL. Migrations auto-run on bootstrap. The `DatabaseModule` is `@Global()` — inject via `DATABASE_TOKEN` string token. Schema in `src/database/schema/`, append-only `price_records` table (INSERT only, never UPDATE).

**Modules:** Auth (JWT + refresh + Google/Kakao OAuth), Products (CRUD + search + deals), Alerts, Builder (PC build estimator + benchmarks), Builds (save/load), Crawler, Users

**Crawler:** Adapter pattern per store (Amazon, Newegg, 11st, Naver, Coupang, GMarket). Bull queue with Redis or InMemoryQueue fallback (`REDIS_MODE=disabled`). Circuit breaker: 10 failures/10min → OPEN, 5min timeout → HALF_OPEN. Cron: GPU/CPU every 30min, RAM/SSD every 2h, discovery daily 2AM.

**Role hierarchy:** admin > master > user

### Web (apps/web)

Next.js App Router with TanStack React Query for server state, `nuqs` for URL search params.

**Key providers (wrap app):** AuthProvider, CurrencyProvider, BuildEstimatorProvider, BuildDetailSidebarProvider

**API client:** `src/lib/api.ts` — custom fetch with auto 401 → refresh token retry. Tokens in localStorage (`token`, `refresh_token`, `user_id`). Fires `auth:expired` event on session timeout.

**UI:** shadcn/ui + Tailwind CSS + Radix primitives. Charts via recharts. Icons via lucide-react.

**Routes:** `/products`, `/products/[slug]`, `/deals`, `/alerts`, `/auth`, `/admin`

## Environment

26 env vars documented in `.env.example`. Key ones:
- `REDIS_MODE`: `disabled` (default, InMemoryQueue) | `local` | `upstash`
- `JWT_SECRET`: min 32 chars
- `ANTHROPIC_API_KEY`: optional, for AI spec extraction

## Production

Web on Vercel, API on Render, DB on Supabase (Transaction pooler port 6543, IPv4 required), Redis on Upstash.

## Gotchas

- Supabase direct connection is IPv6-only — use Transaction pooler (port 6543) with IPv4 toggle ON for Render
- `nest-cli.json` assets config copies `database/migrations/**/*` to dist — required for runtime migrations
- Playwright headless Chromium needed for crawling — blocks images/fonts/CSS for bandwidth savings
- `@nestjs/cli` must be in devDependencies; Render build needs `--prod=false`

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
