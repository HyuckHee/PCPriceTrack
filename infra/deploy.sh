#!/bin/bash
set -e

# Oracle Cloud 서버 배포 스크립트
# 사용법: ./deploy.sh [도메인] [이메일]
# 예시:  ./deploy.sh api.example.com admin@example.com

DOMAIN=${1:-""}
EMAIL=${2:-""}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== PCPriceTrack 배포 시작 ==="

# .env 파일 확인
if [ ! -f "$SCRIPT_DIR/../.env" ]; then
  echo "❌ .env 파일이 없습니다. .env.example을 복사하고 값을 채워주세요."
  exit 1
fi

cd "$SCRIPT_DIR"

# 1. 이미지 빌드 & 컨테이너 시작
echo "→ Docker 컨테이너 시작..."
docker compose -f docker-compose.prod.yml up -d --build

# 2. DB 마이그레이션
echo "→ DB 마이그레이션 실행..."
sleep 5
docker compose -f docker-compose.prod.yml exec api \
  node /app/apps/api/dist/database/migrate.js || true

# 3. SSL 인증서 발급 (도메인 있을 때만)
if [ -n "$DOMAIN" ] && [ -n "$EMAIL" ]; then
  echo "→ SSL 인증서 발급 중... ($DOMAIN)"

  # 임시 HTTP 설정으로 교체
  cp nginx/nginx.init.conf nginx/nginx.conf.bak 2>/dev/null || true

  docker compose -f docker-compose.prod.yml run --rm certbot \
    certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

  # 인증서를 nginx certs 디렉토리에 복사
  mkdir -p nginx/certs
  docker compose -f docker-compose.prod.yml exec certbot \
    cp /etc/letsencrypt/live/"$DOMAIN"/fullchain.pem /var/www/certbot/fullchain.pem || true
  docker compose -f docker-compose.prod.yml exec certbot \
    cp /etc/letsencrypt/live/"$DOMAIN"/privkey.pem /var/www/certbot/privkey.pem || true

  docker compose -f docker-compose.prod.yml restart nginx
  echo "✅ SSL 인증서 발급 완료"
fi

echo ""
echo "✅ 배포 완료!"
echo "   API: http://$(curl -s ifconfig.me)/api/health"
if [ -n "$DOMAIN" ]; then
  echo "   API: https://$DOMAIN/api/health"
fi
