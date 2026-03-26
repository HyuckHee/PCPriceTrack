#!/usr/bin/env bash
# =============================================================================
# db-setup.sh — 개발 DB 전체 셋업 (Docker 기동 → 준비 대기 → 마이그레이션 → 시드)
# 사용법: pnpm db:setup
# =============================================================================
set -euo pipefail

# ── 색상 출력 헬퍼 ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log_info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "\n${BOLD}▶ $1${NC}"; }

# ── 루트 디렉토리 기준으로 경로 고정 ─────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$ROOT_DIR/infra"
ENV_FILE="$ROOT_DIR/.env"

cd "$ROOT_DIR"

# ── .env 파일 확인 ────────────────────────────────────────────────────────────
log_step "환경 변수 확인"
if [ ! -f "$ENV_FILE" ]; then
  log_warn ".env 파일이 없습니다. .env.example 에서 복사합니다..."
  cp "$ROOT_DIR/.env.example" "$ENV_FILE"
  log_warn ".env 파일을 열어 DATABASE_URL 등 필수 값을 확인하세요."
fi

# .env 로드
set -o allexport
source "$ENV_FILE"
set +o allexport

: "${DATABASE_URL:?DATABASE_URL이 .env에 설정되어 있지 않습니다}"
: "${POSTGRES_USER:=pcpricetrack}"
: "${POSTGRES_DB:=pcpricetrack}"

log_success ".env 로드 완료"

# ── Docker 확인 ───────────────────────────────────────────────────────────────
log_step "Docker 상태 확인"
if ! command -v docker &>/dev/null; then
  log_error "Docker가 설치되어 있지 않습니다. https://docs.docker.com/get-docker/ 에서 설치하세요."
  exit 1
fi

if ! docker info &>/dev/null; then
  log_error "Docker 데몬이 실행 중이 아닙니다. Docker Desktop을 시작해주세요."
  exit 1
fi

log_success "Docker 실행 중"

# ── Docker Compose 기동 ───────────────────────────────────────────────────────
log_step "PostgreSQL + Redis 컨테이너 기동"

cd "$INFRA_DIR"

# 이미 실행 중인지 확인
PG_RUNNING=$(docker compose ps --status running postgres 2>/dev/null | grep -c "postgres" || true)

if [ "$PG_RUNNING" -gt 0 ]; then
  log_warn "PostgreSQL 컨테이너가 이미 실행 중입니다. 건너뜁니다."
else
  docker compose up -d postgres redis
  log_success "컨테이너 시작 요청 완료"
fi

cd "$ROOT_DIR"

# ── PostgreSQL 준비 대기 (최대 60초) ─────────────────────────────────────────
log_step "PostgreSQL 준비 대기 중..."

MAX_WAIT=60
WAITED=0
INTERVAL=3

until docker exec pcpricetrack_postgres \
  pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" &>/dev/null; do

  if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    log_error "PostgreSQL이 ${MAX_WAIT}초 내에 준비되지 않았습니다."
    log_error "docker compose logs postgres 로 오류를 확인하세요."
    exit 1
  fi

  printf "\r${YELLOW}  대기 중... ${WAITED}s / ${MAX_WAIT}s${NC}"
  sleep "$INTERVAL"
  WAITED=$((WAITED + INTERVAL))
done

echo "" # 줄바꿈
log_success "PostgreSQL 준비 완료 (${WAITED}s)"

# ── 마이그레이션 실행 ─────────────────────────────────────────────────────────
log_step "마이그레이션 실행"
pnpm --filter api db:migrate
log_success "마이그레이션 완료"

# ── 시드 데이터 삽입 ──────────────────────────────────────────────────────────
log_step "시드 데이터 삽입 (stores + categories)"
pnpm --filter api db:seed
log_success "시드 완료"

# ── 완료 ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}✅ DB 셋업 완료!${NC}"
echo ""
echo -e "  PostgreSQL : ${CYAN}localhost:5432${NC}  (DB: ${POSTGRES_DB})"
echo -e "  Redis      : ${CYAN}localhost:6379${NC}"
echo -e "  Studio     : ${CYAN}pnpm db:studio${NC}  → http://localhost:4983"
echo ""
echo -e "  이제 서버를 실행하세요: ${BOLD}pnpm --filter api dev${NC}"
echo ""
