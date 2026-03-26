-- =============================================================================
-- init.sql — PostgreSQL 유저 + DB 초기 생성 스크립트
-- 로컬: psql -U postgres -f infra/init.sql
-- =============================================================================

-- 유저가 없을 때만 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pcpriceUser'
  ) THEN
    CREATE ROLE "pcpriceUser" WITH LOGIN PASSWORD '!asd123456';
    RAISE NOTICE 'Role "pcpriceUser" created.';
  ELSE
    RAISE NOTICE 'Role "pcpriceUser" already exists. Skipped.';
  END IF;
END
$$;

-- DB가 없을 때만 생성
SELECT 'CREATE DATABASE pcpricetrack OWNER "pcpriceUser"'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'pcpricetrack'
)\gexec

-- 권한 부여
GRANT ALL PRIVILEGES ON DATABASE pcpricetrack TO "pcpriceUser";

\connect pcpricetrack

-- 스키마 소유권
GRANT ALL ON SCHEMA public TO "pcpriceUser";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO "pcpriceUser";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO "pcpriceUser";
