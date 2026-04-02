# DB 데이터 변경 로그

스키마 마이그레이션이 아닌 **데이터 직접 수정** 이력을 기록합니다.

---

## 2026-04-02

### [1] product_listings.url 타입 변경
- **마이그레이션 파일**: `0004_fluffy_cassandra_nova.sql`
- **변경 내용**: `url` 컬럼 `varchar(1000)` → `text` (길이 제한 없음)
- **사유**: Amazon/11번가 상품 URL이 1000자를 초과하여 크롤링 저장 실패
- **SQL**:
  ```sql
  ALTER TABLE "product_listings" ALTER COLUMN "url" SET DATA TYPE text;
  ```

---

### [2] products 상품명 오염 데이터 정리
- **대상 테이블**: `products`
- **사유**: 11번가 크롤러가 찜/공유 팝업 텍스트를 상품명에 포함하여 저장
- **오염 패턴**: `찜 완료`, `찜이 되었습니다`, `페이스북`, `카카오스토리`, `복사` 등
- **실행 전 확인 SQL**:
  ```sql
  SELECT id, name
  FROM products
  WHERE name ~* '찜|페이스북|카카오스토리';
  ```
- **정리 SQL**:
  ```sql
  UPDATE products
  SET name = TRIM(REGEXP_REPLACE(name,
    '찜 완료|찜해제 완료|찜이 되었습니다.*?닫기|찜한상품 전체보기|공유하기|페이스북|카카오스토리|복사|\s{2,}',
    ' ', 'g'))
  WHERE name ~* '찜|페이스북|카카오스토리';
  ```
- **상태**: ⏳ 미실행 (Supabase SQL 에디터에서 직접 실행 필요)

---

### [3] pc_builds 유저별 데이터 분리 (버그 수정)
- **대상 테이블**: `pc_builds`
- **사유**: `user_id` 필터 없이 전체 조회되어 모든 유저의 견적이 공개되던 버그
- **변경 내용**: 백엔드 쿼리에 `WHERE user_id = $userId` 조건 추가 (코드 수정, SQL 직접 실행 불필요)
- **확인 SQL** (유저 없이 저장된 고아 데이터 조회):
  ```sql
  SELECT id, name, created_at FROM pc_builds WHERE user_id IS NULL;
  ```
- **정리 SQL** (필요시 고아 데이터 삭제):
  ```sql
  DELETE FROM pc_builds WHERE user_id IS NULL;
  ```
- **상태**: ✅ 코드 수정 완료 (커밋: `666a9b9`)

---
