import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';

/** 숫자형 스펙 키 — min/max range 타입으로 반환 (실제 스키마 키 기준) */
const NUMERIC_SPEC_KEYS = new Set([
  // CPU
  'cores', 'threads', 'tdp', 'baseClockGhz', 'boostClockGhz',
  // GPU
  'vramGb', 'lengthMm', 'widthSlots', 'recommendedPsuWattage',
  // RAM
  'capacityGb', 'speedMhz', 'modules', 'moduleCapacityGb', 'casLatency',
  // PSU
  'wattage',
  // 쿨러
  'tdpRating', 'heightMm', 'fanCount',
  // 저장장치
  'readMbps', 'writeMbps', 'rpm',
  // 마더보드
  'ramSlots', 'maxRamGb', 'maxRamSpeedMhz', 'm2Slots', 'sataPorts', 'pcieX16Slots',
]);

interface CacheEntry {
  data: unknown;
  expiry: number;
}

/** 1시간 TTL */
const CACHE_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class FacetsService {
  /** 메모리 캐시 (카테고리별) */
  private cache = new Map<string, CacheEntry>();

  constructor(@Inject('PG_POOL') private pool: Pool) {}

  /**
   * 카테고리별 필터 패싯 조회.
   *
   * specs 키별 range/enum 정보, 브랜드 목록, 성능 점수 범위를 반환합니다.
   */
  async getFacets(categoryId: string) {
    // 캐시 확인
    const cached = this.cache.get(categoryId);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    // specs 키-값 집계, 브랜드, 성능 점수 범위를 병렬 조회
    const [specsResult, brandsResult, perfResult] = await Promise.all([
      this.pool.query(
        `SELECT key,
                jsonb_agg(DISTINCT value) AS values,
                COUNT(DISTINCT value) AS distinct_count
         FROM products, jsonb_each_text(specs)
         WHERE category_id = $1 AND specs != '{}'::jsonb
         GROUP BY key`,
        [categoryId],
      ),
      this.pool.query(
        `SELECT DISTINCT brand FROM products WHERE category_id = $1 AND brand IS NOT NULL ORDER BY brand`,
        [categoryId],
      ),
      this.pool.query(
        `SELECT MIN(performance_score) AS min, MAX(performance_score) AS max
         FROM products WHERE category_id = $1 AND performance_score IS NOT NULL`,
        [categoryId],
      ),
    ]);

    // specs 변환: 숫자형은 range, 문자형은 enum
    const specs: Record<string, unknown> = {};
    for (const row of specsResult.rows) {
      const key = row.key as string;
      const rawValues = row.values as string[];

      if (NUMERIC_SPEC_KEYS.has(key)) {
        const nums = rawValues.map(Number).filter((n) => !isNaN(n));
        if (nums.length > 0) {
          specs[key] = {
            type: 'range' as const,
            min: Math.min(...nums),
            max: Math.max(...nums),
          };
        }
      } else {
        specs[key] = {
          type: 'enum' as const,
          values: rawValues,
        };
      }
    }

    const brands = brandsResult.rows.map((r) => r.brand as string);
    const perfRow = perfResult.rows[0] as Record<string, unknown> | undefined;
    const performanceScore = perfRow
      ? { min: perfRow.min != null ? Number(perfRow.min) : null, max: perfRow.max != null ? Number(perfRow.max) : null }
      : { min: null, max: null };

    const data = { specs, brands, performanceScore };

    // 캐시 저장
    this.cache.set(categoryId, { data, expiry: Date.now() + CACHE_TTL_MS });

    return data;
  }

  /** 특정 카테고리의 캐시를 무효화 */
  invalidateCache(categoryId: string) {
    this.cache.delete(categoryId);
  }
}
