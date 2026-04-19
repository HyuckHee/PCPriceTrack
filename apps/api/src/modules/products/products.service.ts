import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { Database, DATABASE_TOKEN } from '../../database/database.provider';
import { products } from '../../database/schema/products';
import { productGroups } from '../../database/schema/product-groups';
import { categories } from '../../database/schema/categories';
import { productListings } from '../../database/schema/product-listings';
import { priceRecords } from '../../database/schema/price-records';
import { stores } from '../../database/schema/stores';
import { ListProductsDto } from './dto/list-products.dto';

/** 통화별 적정 가격 범위 — 이 범위를 벗어나면 크롤링 오염 데이터로 간주 */
const PRICE_SANITY_FILTER = sql.raw(`
  AND (
    (pr.currency = 'USD' AND pr.price::numeric BETWEEN 1 AND 7000)
    OR
    (pr.currency = 'KRW' AND pr.price::numeric BETWEEN 1000 AND 10000000)
  )
`);

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject('PG_POOL') private pool: Pool,
  ) {}

  // ─── 리스트 ─────────────────────────────────────────────────────────────

  /**
   * 상품 목록 (그룹 단위).
   *
   * group_id가 있는 products는 그룹으로 집계되어 1개 카드로 반환됩니다.
   * 가격은 그룹 내 모든 리스팅의 최저가 ~ 최고가 범위로 표시합니다.
   */
  async list(dto: ListProductsDto) {
    const { page = 1, limit = 20, categoryId, brand, search, minPrice, maxPrice, sortBy = 'newest' } = dto;

    const ORDER_BY_MAP: Record<string, string> = {
      newest:    'p.created_at DESC',
      popular:   'gp.store_count DESC NULLS LAST, p.created_at DESC',
      price_asc: 'gp.min_price ASC NULLS LAST',
      price_desc:'gp.min_price DESC NULLS LAST',
      name:      'p.name ASC',
    };
    const orderBy = ORDER_BY_MAP[sortBy] ?? 'p.created_at DESC';
    const offset = (page - 1) * limit;

    // ── 동적 WHERE 파라미터 수집 ──────────────────────────────────────────
    const extraWhere: string[] = [];
    const params: unknown[] = [];
    let pi = 1; // parameter index

    if (categoryId) { extraWhere.push(`p.category_id = $${pi++}`); params.push(categoryId); }
    if (brand)      { extraWhere.push(`p.brand ILIKE $${pi++}`);    params.push(`%${brand}%`); }
    if (search)     {
      extraWhere.push(`(p.name ILIKE $${pi} OR p.brand ILIKE $${pi} OR p.model ILIKE $${pi})`);
      params.push(`%${search}%`);
      pi++;
    }

    const whereClause = extraWhere.length
      ? `AND (p.group_id IS NULL OR p.id = (SELECT p2.id FROM products p2 WHERE p2.group_id = p.group_id ORDER BY p2.created_at LIMIT 1)) AND ${extraWhere.join(' AND ')}`
      : `AND (p.group_id IS NULL OR p.id = (SELECT p2.id FROM products p2 WHERE p2.group_id = p.group_id ORDER BY p2.created_at LIMIT 1))`;

    const priceWhereData: string[] = [];
    if (minPrice !== undefined) { priceWhereData.push(`COALESCE(gp.min_price, 0) >= $${pi++}`); params.push(minPrice); }
    if (maxPrice !== undefined) { priceWhereData.push(`COALESCE(gp.min_price, 0) <= $${pi++}`); params.push(maxPrice); }
    const priceFilterData = priceWhereData.length ? `AND ${priceWhereData.join(' AND ')}` : '';

    const limitIdx = pi++;   params.push(limit);
    const offsetIdx = pi++;  params.push(offset);

    // Count params (separate — reuse same param values but rebuild indices)
    const countParams: unknown[] = [];
    let ci = 1;
    const countExtraWhere: string[] = [];
    if (categoryId) { countExtraWhere.push(`p.category_id = $${ci++}`); countParams.push(categoryId); }
    if (brand)      { countExtraWhere.push(`p.brand ILIKE $${ci++}`);    countParams.push(`%${brand}%`); }
    if (search)     {
      countExtraWhere.push(`(p.name ILIKE $${ci} OR p.brand ILIKE $${ci} OR p.model ILIKE $${ci})`);
      countParams.push(`%${search}%`);
      ci++;
    }
    const countWhere = countExtraWhere.length
      ? `AND (p.group_id IS NULL OR p.id = (SELECT p2.id FROM products p2 WHERE p2.group_id = p.group_id ORDER BY p2.created_at LIMIT 1)) AND ${countExtraWhere.join(' AND ')}`
      : `AND (p.group_id IS NULL OR p.id = (SELECT p2.id FROM products p2 WHERE p2.group_id = p.group_id ORDER BY p2.created_at LIMIT 1))`;
    const countPriceWhere: string[] = [];
    if (minPrice !== undefined) { countPriceWhere.push(`COALESCE(gp.min_price, 0) >= $${ci++}`); countParams.push(minPrice); }
    if (maxPrice !== undefined) { countPriceWhere.push(`COALESCE(gp.min_price, 0) <= $${ci++}`); countParams.push(maxPrice); }
    const priceFilterCount = countPriceWhere.length ? `AND ${countPriceWhere.join(' AND ')}` : '';

    const dataSQL = `
      WITH group_prices AS (
        SELECT
          COALESCE(p.group_id::text, p.id::text) AS group_key,
          MIN(pr.price::numeric) FILTER (WHERE
            (pr.currency = 'USD' AND pr.price::numeric BETWEEN 1 AND 7000) OR
            (pr.currency = 'KRW' AND pr.price::numeric BETWEEN 1000 AND 10000000)
          ) AS min_price,
          MAX(pr.price::numeric) FILTER (WHERE
            (pr.currency = 'USD' AND pr.price::numeric BETWEEN 1 AND 7000) OR
            (pr.currency = 'KRW' AND pr.price::numeric BETWEEN 1000 AND 10000000)
          ) AS max_price,
          MIN(pr.currency) AS currency,
          COUNT(DISTINCT pl.store_id) AS store_count,
          STRING_AGG(s.name, ', ') AS store_names
        FROM products p
        INNER JOIN product_listings pl ON pl.product_id = p.id AND pl.is_active = true
        INNER JOIN price_records pr ON pr.listing_id = pl.id
          AND pr.recorded_at = (SELECT MAX(pr3.recorded_at) FROM price_records pr3 WHERE pr3.listing_id = pl.id)
        INNER JOIN stores s ON pl.store_id = s.id
        GROUP BY COALESCE(p.group_id::text, p.id::text)
      ),
      prev_prices AS (
        SELECT
          COALESCE(p.group_id::text, p.id::text) AS group_key,
          MIN(ranked.price) AS prev_min_price
        FROM (
          SELECT pl.product_id,
                 pr.price::numeric AS price,
                 ROW_NUMBER() OVER (PARTITION BY pl.id ORDER BY pr.recorded_at DESC) AS rn
          FROM price_records pr
          INNER JOIN product_listings pl ON pr.listing_id = pl.id AND pl.is_active = true
          WHERE (pr.currency = 'USD' AND pr.price::numeric BETWEEN 1 AND 7000)
             OR (pr.currency = 'KRW' AND pr.price::numeric BETWEEN 1000 AND 10000000)
        ) ranked
        INNER JOIN products p ON p.id = ranked.product_id
        WHERE ranked.rn = 2
        GROUP BY COALESCE(p.group_id::text, p.id::text)
      )
      SELECT
        p.id, p.group_id AS "groupId", p.name, p.brand, p.model, p.slug,
        p.image_url AS "imageUrl", p.specs, p.created_at AS "createdAt",
        c.id AS "cat_id", c.name AS "cat_name", c.slug AS "cat_slug",
        pg.id AS "grp_id", pg.name AS "grp_name", pg.slug AS "grp_slug",
        gp.min_price AS "minPrice", gp.max_price AS "maxPrice",
        gp.currency, gp.store_count AS "storeCount", gp.store_names AS "storeNames",
        pp.prev_min_price AS "previousMinPrice"
      FROM products p
      INNER JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_groups pg ON pg.id = p.group_id
      LEFT JOIN group_prices gp ON gp.group_key = COALESCE(p.group_id::text, p.id::text)
      LEFT JOIN prev_prices pp ON pp.group_key = COALESCE(p.group_id::text, p.id::text)
      WHERE 1=1
      ${whereClause}
      ${priceFilterData}
      ORDER BY ${orderBy}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const countSQL = `
      WITH group_prices AS (
        SELECT
          COALESCE(p.group_id::text, p.id::text) AS group_key,
          MIN(pr.price::numeric) FILTER (WHERE
            (pr.currency = 'USD' AND pr.price::numeric BETWEEN 1 AND 7000) OR
            (pr.currency = 'KRW' AND pr.price::numeric BETWEEN 1000 AND 10000000)
          ) AS min_price
        FROM products p
        INNER JOIN product_listings pl ON pl.product_id = p.id AND pl.is_active = true
        INNER JOIN price_records pr ON pr.listing_id = pl.id
          AND pr.recorded_at = (SELECT MAX(pr3.recorded_at) FROM price_records pr3 WHERE pr3.listing_id = pl.id)
        GROUP BY COALESCE(p.group_id::text, p.id::text)
      )
      SELECT COUNT(*)::int AS count
      FROM products p
      INNER JOIN categories c ON c.id = p.category_id
      LEFT JOIN group_prices gp ON gp.group_key = COALESCE(p.group_id::text, p.id::text)
      WHERE 1=1
      ${countWhere}
      ${priceFilterCount}
    `;

    // pg pool 직접 사용 (Drizzle sql template 파라미터 중복 방지)

    try {
      const [dataResult, countResult] = await Promise.all([
        this.pool.query(dataSQL, params),
        this.pool.query(countSQL, countParams),
      ]);

      const rows = (dataResult.rows as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        groupId: r['groupId'] as string | null,
        name: r.name as string,
        brand: r.brand as string,
        model: r.model as string,
        slug: r.slug as string,
        imageUrl: r['imageUrl'] as string | null,
        specs: r.specs as Record<string, unknown>,
        createdAt: r['createdAt'] as Date,
        category: { id: r['cat_id'] as string, name: r['cat_name'] as string, slug: r['cat_slug'] as string },
        group: r['grp_id'] ? { id: r['grp_id'] as string, name: r['grp_name'] as string, slug: r['grp_slug'] as string } : null,
        minPrice: r['minPrice'] != null ? String(r['minPrice']) : null,
        maxPrice: r['maxPrice'] != null ? String(r['maxPrice']) : null,
        currency: r.currency as string | null,
        previousMinPrice: r['previousMinPrice'] != null ? String(r['previousMinPrice']) : null,
        storeCount: r['storeCount'] != null ? Number(r['storeCount']) : null,
        storeNames: r['storeNames'] as string | null,
      }));

      const total = Number((countResult.rows[0] as Record<string, unknown>).count ?? 0);

      return {
        data: rows,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    } catch (e) {
      throw e;
    }
  }

  // ─── 딜 ─────────────────────────────────────────────────────────────────

  async deals(limit = 20, categoryId?: string) {
    const rows = await this.db.execute(sql`
      WITH latest_record AS (
        SELECT DISTINCT ON (pr.listing_id)
          pl.product_id,
          pr.price::numeric       AS current_price,
          pr.original_price::numeric AS original_price,
          pr.currency,
          pr.recorded_at
        FROM price_records pr
        INNER JOIN product_listings pl ON pr.listing_id = pl.id
        WHERE pl.is_active = true
        ORDER BY pr.listing_id, pr.recorded_at DESC
      ),
      best_per_product AS (
        SELECT DISTINCT ON (product_id)
          product_id,
          current_price,
          original_price,
          currency
        FROM latest_record
        WHERE original_price IS NOT NULL
          AND original_price > current_price
          AND current_price > 0
          AND (
            (currency = 'USD' AND current_price BETWEEN 1 AND 7000 AND original_price BETWEEN 1 AND 7000)
            OR
            (currency = 'KRW' AND current_price BETWEEN 1000 AND 10000000 AND original_price BETWEEN 1000 AND 10000000)
          )
          AND original_price <= current_price * 3
        ORDER BY product_id, ((original_price - current_price) / original_price) DESC
      )
      SELECT
        COALESCE(pg.id,   p.id)         AS "id",
        COALESCE(pg.name, p.name)       AS "name",
        p.brand,
        COALESCE(pg.slug, p.slug)       AS "slug",
        COALESCE(pg.image_url, p.image_url) AS "imageUrl",
        c.name AS "categoryName", c.slug AS "categorySlug",
        b.current_price  AS "currentPrice",
        b.original_price AS "previousPrice",
        b.original_price AS "originalPrice",
        b.currency       AS "currency"
      FROM products p
      INNER JOIN categories c          ON p.category_id = c.id
      INNER JOIN best_per_product b    ON b.product_id = p.id
      LEFT  JOIN product_groups pg     ON p.group_id = pg.id
      ${categoryId ? sql`WHERE p.category_id = ${categoryId}` : sql``}
      ORDER BY ((b.original_price - b.current_price) / b.original_price) DESC
      LIMIT ${limit}
    `);

    return rows.rows;
  }

  // ─── 상세 ────────────────────────────────────────────────────────────────

  /**
   * 슬러그로 상품 상세 조회.
   *
   * 1. product_groups.slug 로 먼저 조회 → 그룹 상세 반환 (variants[] 포함)
   * 2. 없으면 products.slug 로 조회 → 단독 제품 상세 반환
   */
  async findBySlug(slug: string) {
    // ── 1. 그룹 slug 조회 시도 ─────────────────────────────────────────────
    const [group] = await this.db
      .select()
      .from(productGroups)
      .where(eq(productGroups.slug, slug))
      .limit(1);

    if (group) {
      return this.findGroupDetail(group.id);
    }

    // ── 2. product slug로 조회 ─────────────────────────────────────────────
    const [product] = await this.db
      .select({ id: products.id, groupId: products.groupId })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (!product) throw new NotFoundException('Product not found');

    // 그룹이 있으면 그룹 상세로 redirect (그룹 단위 반환)
    if (product.groupId) {
      return this.findGroupDetail(product.groupId);
    }

    return this.findSingleProductDetail(product.id);
  }

  // ─── 가격 히스토리 (그룹 범위) ──────────────────────────────────────────

  async priceHistory(slug: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // 그룹 또는 단독 제품의 모든 product ID 수집
    const productIds = await this.resolveProductIds(slug);
    if (productIds.length === 0) throw new NotFoundException('Product not found');

    const rows = await this.db
      .select({
        price: priceRecords.price,
        currency: priceRecords.currency,
        inStock: priceRecords.inStock,
        recordedAt: priceRecords.recordedAt,
        store: {
          id: stores.id,
          name: stores.name,
        },
        variantName: products.name,
      })
      .from(priceRecords)
      .innerJoin(productListings, eq(priceRecords.listingId, productListings.id))
      .innerJoin(stores, eq(productListings.storeId, stores.id))
      .innerJoin(products, eq(productListings.productId, products.id))
      .where(
        and(
          sql`${productListings.productId} = ANY(${sql.raw(`ARRAY[${productIds.map(id => `'${id}'`).join(',')}]::uuid[]`)})`,
          sql`${priceRecords.recordedAt} >= ${since}`,
          sql`(
            (${priceRecords.currency} = 'USD' AND ${priceRecords.price}::numeric BETWEEN 1 AND 7000)
            OR
            (${priceRecords.currency} = 'KRW' AND ${priceRecords.price}::numeric BETWEEN 1000 AND 10000000)
          )`,
        ),
      )
      .orderBy(desc(priceRecords.recordedAt));

    return rows;
  }

  // ─── 그룹 머지 (Admin) ──────────────────────────────────────────────────

  /**
   * 여러 product를 하나의 product_group으로 묶습니다.
   * groupName 미지정 시 첫 번째 product의 이름을 사용합니다.
   */
  async mergeGroup(productIds: string[], groupName?: string): Promise<{ groupId: string }> {
    if (productIds.length < 2) {
      throw new Error('그룹 머지는 최소 2개 이상의 product가 필요합니다.');
    }

    // 첫 번째 product 정보 조회 (대표 이름·slug·이미지 사용)
    const [firstProduct] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, productIds[0]))
      .limit(1);

    if (!firstProduct) throw new NotFoundException(`Product not found: ${productIds[0]}`);

    // 이미 그룹이 있으면 재사용, 없으면 생성
    let groupId: string;
    if (firstProduct.groupId) {
      groupId = firstProduct.groupId;
    } else {
      const [newGroup] = await this.db
        .insert(productGroups)
        .values({
          name: groupName ?? firstProduct.name,
          slug: firstProduct.slug,        // 기존 slug 재사용 (URL 유지)
          imageUrl: firstProduct.imageUrl ?? undefined,
        })
        .onConflictDoNothing()
        .returning({ id: productGroups.id });

      // conflict 시 기존 slug 그룹 조회
      if (!newGroup) {
        const [existing] = await this.db
          .select({ id: productGroups.id })
          .from(productGroups)
          .where(eq(productGroups.slug, firstProduct.slug))
          .limit(1);
        if (!existing) throw new Error('그룹 생성 실패');
        groupId = existing.id;
      } else {
        groupId = newGroup.id;
      }
    }

    // 모든 product에 group_id 할당
    for (const pid of productIds) {
      await this.db
        .update(products)
        .set({ groupId, updatedAt: new Date() })
        .where(eq(products.id, pid));
    }

    return { groupId };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private async findGroupDetail(groupId: string) {
    const [group] = await this.db
      .select()
      .from(productGroups)
      .where(eq(productGroups.id, groupId))
      .limit(1);

    if (!group) throw new NotFoundException('Group not found');

    // 그룹 내 모든 variants + 각 listings
    const variants = await this.db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        model: products.model,
        slug: products.slug,
        imageUrl: products.imageUrl,
        specs: products.specs,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.groupId, groupId));

    // 각 variant의 listings (최신 가격 포함)
    const variantsWithListings = await Promise.all(
      variants.map(async (variant) => {
        const listings = await this.getListingsForProduct(variant.id);
        return { ...variant, listings };
      }),
    );

    return {
      type: 'group' as const,
      group,
      variants: variantsWithListings,
    };
  }

  private async findSingleProductDetail(productId: string) {
    const [product] = await this.db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        model: products.model,
        slug: products.slug,
        imageUrl: products.imageUrl,
        description: products.description,
        specs: products.specs,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) throw new NotFoundException('Product not found');

    const listings = await this.getListingsForProduct(productId);

    return {
      type: 'product' as const,
      ...product,
      listings,
    };
  }

  private async getListingsForProduct(productId: string) {
    return this.db
      .select({
        listingId: productListings.id,
        url: productListings.url,
        externalId: productListings.externalId,
        lastSeenAt: productListings.lastSeenAt,
        store: {
          id: stores.id,
          name: stores.name,
          logoUrl: stores.logoUrl,
        },
        latestPrice: sql<string>`(
          SELECT pr.price FROM price_records pr
          WHERE pr.listing_id = ${productListings.id}
            ${PRICE_SANITY_FILTER}
          ORDER BY pr.recorded_at DESC
          LIMIT 1
        )`,
        latestCurrency: sql<string>`(
          SELECT pr.currency FROM price_records pr
          WHERE pr.listing_id = ${productListings.id}
            ${PRICE_SANITY_FILTER}
          ORDER BY pr.recorded_at DESC
          LIMIT 1
        )`,
        latestOriginalPrice: sql<string>`(
          SELECT pr.original_price FROM price_records pr
          WHERE pr.listing_id = ${productListings.id}
            AND pr.original_price IS NOT NULL
            ${PRICE_SANITY_FILTER}
          ORDER BY pr.recorded_at DESC
          LIMIT 1
        )`,
        inStock: sql<boolean>`(
          SELECT pr.in_stock FROM price_records pr
          WHERE pr.listing_id = ${productListings.id}
            ${PRICE_SANITY_FILTER}
          ORDER BY pr.recorded_at DESC
          LIMIT 1
        )`,
      })
      .from(productListings)
      .innerJoin(stores, eq(productListings.storeId, stores.id))
      .where(and(eq(productListings.productId, productId), eq(productListings.isActive, true)));
  }

  /** slug → 해당 그룹 또는 단독 제품의 product ID 목록 반환 */
  private async resolveProductIds(slug: string): Promise<string[]> {
    // 그룹 slug?
    const [group] = await this.db
      .select({ id: productGroups.id })
      .from(productGroups)
      .where(eq(productGroups.slug, slug))
      .limit(1);

    if (group) {
      const members = await this.db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.groupId, group.id));
      return members.map((m) => m.id);
    }

    // product slug?
    const [product] = await this.db
      .select({ id: products.id, groupId: products.groupId })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (!product) return [];
    if (product.groupId) {
      const members = await this.db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.groupId, product.groupId));
      return members.map((m) => m.id);
    }
    return [product.id];
  }
}
