#!/usr/bin/env bash
# =============================================================================
# db-create-user.sh — PostgreSQL 유저 + DB 수동 생성
# Docker를 쓰지 않고 로컬 PostgreSQL에 직접 생성할 때 사용
# 사용법: pnpm db:create-user
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "\n${BOLD}▶ $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env"

# ── .env 로드 ─────────────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  log_error ".env 파일이 없습니다."
  exit 1
fi

set -o allexport
source "$ENV_FILE"
set +o allexport

DB_USER="${POSTGRES_USER:-pcpricetrack}"
DB_PASSWORD="${POSTGRES_PASSWORD:-pcpricetrack_dev}"
DB_NAME="${POSTGRES_DB:-pcpricetrack}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

# ── 실행 방법 선택 ────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}PostgreSQL 유저 생성 방법을 선택하세요:${NC}"
echo ""
echo "  1) Docker 컨테이너 (pcpricetrack_postgres) 사용"
echo "  2) 로컬 PostgreSQL 사용 (psql 명령어 필요)"
echo ""
read -r -p "선택 [1/2]: " METHOD

case "$METHOD" in
  1)
    log_step "Docker 컨테이너로 유저 생성"

    if ! docker exec pcpricetrack_postgres pg_isready -U postgres &>/dev/null 2>&1; then
      # postgres superuser가 없으면 환경변수 유저로 시도
      PSQL_CMD="docker exec -i pcpricetrack_postgres psql -U ${DB_USER} -d postgres"
    else
      PSQL_CMD="docker exec -i pcpricetrack_postgres psql -U postgres"
    fi

    $PSQL_CMD <<-EOSQL
      DO \$\$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}'
        ) THEN
          CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
          RAISE NOTICE 'Role "${DB_USER}" created.';
        ELSE
          ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
          RAISE NOTICE 'Role "${DB_USER}" already exists. Password updated.';
        END IF;
      END
      \$\$;

      SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
      WHERE NOT EXISTS (
        SELECT FROM pg_database WHERE datname = '${DB_NAME}'
      )\gexec

      GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOSQL

    # DB에 접속해서 스키마 권한 부여
    docker exec -i pcpricetrack_postgres psql -U "${DB_USER}" -d "${DB_NAME}" <<-EOSQL
      GRANT ALL ON SCHEMA public TO ${DB_USER};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
EOSQL
    ;;

  2)
    log_step "로컬 PostgreSQL로 유저 생성"

    if ! command -v psql &>/dev/null; then
      log_error "psql 명령어를 찾을 수 없습니다. PostgreSQL 클라이언트를 설치하세요."
      echo ""
      echo "  macOS:  brew install postgresql"
      echo "  Ubuntu: sudo apt install postgresql-client"
      exit 1
    fi

    echo ""
    log_warn "PostgreSQL superuser(postgres)의 비밀번호를 입력해야 할 수 있습니다."
    echo ""

    psql -h "$DB_HOST" -p "$DB_PORT" -U postgres <<-EOSQL
      DO \$\$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}'
        ) THEN
          CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
          RAISE NOTICE 'Role "${DB_USER}" created.';
        ELSE
          ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
          RAISE NOTICE 'Role "${DB_USER}" already exists. Password updated.';
        END IF;
      END
      \$\$;

      SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
      WHERE NOT EXISTS (
        SELECT FROM pg_database WHERE datname = '${DB_NAME}'
      )\gexec

      GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOSQL

    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<-EOSQL
      GRANT ALL ON SCHEMA public TO ${DB_USER};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
EOSQL
    ;;

  *)
    log_error "잘못된 선택입니다."
    exit 1
    ;;
esac

# ── 완료 ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}✅ 유저 생성 완료!${NC}"
echo ""
echo -e "  유저     : ${CYAN}${DB_USER}${NC}"
echo -e "  DB       : ${CYAN}${DB_NAME}${NC}"
echo -e "  비밀번호 : ${CYAN}${DB_PASSWORD}${NC}"
echo -e "  호스트   : ${CYAN}${DB_HOST}:${DB_PORT}${NC}"
echo ""
echo -e "  다음 단계: ${BOLD}pnpm db:migrate${NC}"
echo ""
