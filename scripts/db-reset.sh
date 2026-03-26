#!/usr/bin/env bash
# =============================================================================
# db-reset.sh — 개발 DB 완전 초기화 (볼륨 삭제 → 재생성 → 마이그레이션 → 시드)
# ⚠️  모든 데이터가 삭제됩니다. 개발 환경 전용으로 사용하세요.
# 사용법: pnpm db:reset
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "\n${BOLD}▶ $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$ROOT_DIR/infra"
ENV_FILE="$ROOT_DIR/.env"

cd "$ROOT_DIR"

# ── 경고 확인 ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${RED}${BOLD}⚠️  경고: DB 완전 초기화${NC}"
echo -e "  PostgreSQL 볼륨을 삭제하고 DB를 처음부터 다시 생성합니다."
echo -e "  ${RED}모든 데이터(상품, 가격 이력, 사용자 등)가 삭제됩니다.${NC}"
echo ""
read -r -p "계속하시겠습니까? (yes 입력 시 진행): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  log_warn "취소되었습니다."
  exit 0
fi

# ── .env 로드 ─────────────────────────────────────────────────────────────────
log_step "환경 변수 로드"
if [ ! -f "$ENV_FILE" ]; then
  log_error ".env 파일이 없습니다. 먼저 pnpm db:setup 을 실행하세요."
  exit 1
fi

set -o allexport
source "$ENV_FILE"
set +o allexport

: "${DATABASE_URL:?DATABASE_URL이 .env에 설정되어 있지 않습니다}"
: "${POSTGRES_USER:=pcpricetrack}"
: "${POSTGRES_DB:=pcpricetrack}"
log_success ".env 로드 완료"

# ── Docker 확인 ───────────────────────────────────────────────────────────────
log_step "Docker 상태 확인"
if ! docker info &>/dev/null; then
  log_error "Docker 데몬이 실행 중이 아닙니다."
  exit 1
fi

# ── 컨테이너 + 볼륨 삭제 ─────────────────────────────────────────────────────
log_step "컨테이너 및 PostgreSQL 볼륨 삭제"
cd "$INFRA_DIR"
docker compose down -v --remove-orphans 2>/dev/null || true
log_success "컨테이너 및 볼륨 삭제 완료"

# ── 컨테이너 재기동 ───────────────────────────────────────────────────────────
log_step "컨테이너 재기동"
docker compose up -d postgres redis
log_success "컨테이너 시작 완료"
cd "$ROOT_DIR"

# ── PostgreSQL 준비 대기 ──────────────────────────────────────────────────────
log_step "PostgreSQL 준비 대기 중..."
MAX_WAIT=60
WAITED=0
INTERVAL=3

until docker exec pcpricetrack_postgres \
  pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" &>/dev/null; do

  if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    log_error "PostgreSQL이 ${MAX_WAIT}초 내에 준비되지 않았습니다."
    exit 1
  fi

  printf "\r${YELLOW}  대기 중... ${WAITED}s / ${MAX_WAIT}s${NC}"
  sleep "$INTERVAL"
  WAITED=$((WAITED + INTERVAL))
done

echo ""
log_success "PostgreSQL 준비 완료 (${WAITED}s)"

# ── 마이그레이션 + 시드 ───────────────────────────────────────────────────────
log_step "마이그레이션 실행"
pnpm --filter api db:migrate
log_success "마이그레이션 완료"

log_step "시드 데이터 삽입"
pnpm --filter api db:seed
log_success "시드 완료"

# ── 완료 ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}✅ DB 초기화 완료!${NC}"
echo ""
echo -e "  PostgreSQL : ${CYAN}localhost:5432${NC}  (DB: ${POSTGRES_DB})"
echo -e "  Redis      : ${CYAN}localhost:6379${NC}"
echo -e "  Studio     : ${CYAN}pnpm db:studio${NC}  → http://localhost:4983"
echo ""
