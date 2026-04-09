import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
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
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  // ─── 리스트 ─────────────────────────────────────────────────────────────

  /**
   * 상품 목록 (그룹 단위).
   *
   * group_id가 있는 products는 그룹으로 집계되어 1개 카드로 반환됩니다.
   * 가격은 그룹 내 모든 리스팅의 최저가 ~ 최고가 범위로 표시합니다.
   */
  async list(dto: ListProductsDto) {
    const { page = 1, limit = 20, categoryId, brand, search, minPrice, maxPrice } = dto;
    const offset = (page - 1) * limit;

    // ── 핵심 서브쿼리: 그룹(또는 독립 제품) 단위 최저/최고가 ──────────────
    // group_id가 있으면 같은 그룹의 모든 product_listings를 포함해 집계
    const groupMinPriceSub = sql<string>`(
      SELECT MIN(pr.price::numeric)
      FROM price_records pr
      INNER JOIN product_listings pl ON pr.listing_id = pl.id
      INNER JOIN products p2          ON pl.product_id = p2.id
      WHERE (
        -- 그룹이면 같은 group_id, 독립 제품이면 자기 자신
        (${products.groupId} IS NOT NULL AND p2.group_id = ${products.groupId})
        OR
        (${products.groupId} IS NULL AND p2.id = ${products.id})
      )
      AND pl.is_active = true
      AND pr.recorded_at = (
        SELECT MAX(pr2.recorded_at) FROM price_records pr2 WHERE pr2.listing_id = pl.id
      )
      ${PRICE_SANITY_FILTER}
    )`;

    const groupMaxPriceSub = sql<string>`(
      SELECT MAX(pr.price::numeric)
      FROM price_records pr
      INNER JOIN product_listings pl ON pr.listing_id = pl.id
      INNER JOIN products p2          ON pl.product_id = p2.id
      WHERE (
        (${products.groupId} IS NOT NULL AND p2.group_id = ${products.groupId})
        OR
        (${products.groupId} IS NULL AND p2.id = ${products.id})
      )
      AND pl.is_active = true
      AND pr.recorded_at = (
        SELECT MAX(pr2.recorded_at) FROM price_records pr2 WHERE pr2.listing_id = pl.id
      )
      ${PRICE_SANITY_FILTER}
    )`;

    const groupCurrencySub = sql<string>`(
      SELECT pr.currency
      FROM price_records pr
      INNER JOIN product_listings pl ON pr.listing_id = pl.id
      INNER JOIN products p2          ON pl.product_id = p2.id
      WHERE (
        (${products.groupId} IS NOT NULL AND p2.group_id = ${products.groupId})
        OR
        (${products.groupId} IS NULL AND p2.id = ${products.id})
      )
      AND pl.is_active = true
      AND pr.recorded_at = (
        SELECT MAX(pr2.recorded_at) FROM price_records pr2 WHERE pr2.listing_id = pl.id
      )
      ${PRICE_SANITY_FILTER}
      ORDER BY pr.price::numeric ASC
      LIMIT 1
    )`;

    const groupStoreCountSub = sql<number>`(
      SELECT COUNT(DISTINCT pl.store_id)
      FROM product_listings pl
      INNER JOIN products p2 ON pl.product_id = p2.id
      WHERE (
        (${products.groupId} IS NOT NULL AND p2.group_id = ${products.groupId})
        OR
        (${products.groupId} IS NULL AND p2.id = ${products.id})
      )
      AND pl.is_active = true
    )`;

    const groupStoreNamesSub = sql<string>`(
      SELECT STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name)
      FROM product_listings pl
      INNER JOIN products p2 ON pl.product_id = p2.id
      INNER JOIN stores s    ON pl.store_id = s.id
      WHERE (
        (${products.groupId} IS NOT NULL AND p2.group_id = ${products.groupId})
        OR
        (${products.groupId} IS NULL AND p2.id = ${products.id})
      )
      AND pl.is_active = true
    )`;

    const previousGroupMinPriceSub = sql<string>`(
      SELECT MIN(rn2.price) FROM (
        SELECT pr.price::numeric AS price,
               RANK() OVER (PARTITION BY pr.listing_id ORDER BY pr.recorded_at DESC) AS rn
        FROM price_records pr
        INNER JOIN product_listings pl ON pr.listing_id = pl.id
        INNER JOIN products p2          ON pl.product_id = p2.id
        WHERE (
          (${products.groupId} IS NOT NULL AND p2.group_id = ${products.groupId})
          OR
          (${products.groupId} IS NULL AND p2.id = ${products.id})
        )
        ${PRICE_SANITY_FILTER}
      ) AS rn2 WHERE rn2.rn = 2
    )`;

    // ── 그룹의 대표 이미지/이름 (group 우선, 없으면 product) ──────────────
    const displayNameSub = sql<string>`(
      SELECT COALESCE(pg.name, ${products.name})
      FROM products p3
      LEFT JOIN product_groups pg ON p3.group_id = pg.id
      WHERE p3.id = ${products.id}
      LIMIT 1
    )`;

    const displayImageSub = sql<string>`(
      SELECT COALESCE(pg.image_url, ${products.imageUrl})
      FROM products p3
      LEFT JOIN product_groups pg ON p3.group_id = pg.id
      WHERE p3.id = ${products.id}
      LIMIT 1
    )`;

    // ── WHERE 조건 ──────────────────────────────────────────────────────────
    // 그룹이 있는 경우 그룹의 첫 번째 product(대표)만 리스트에 표시
    const isGroupRepresentative = sql<boolean>`(
      ${products.groupId} IS NULL
      OR ${products.id} = (
        SELECT MIN(p_inner.id)
        FROM products p_inner
        WHERE p_inner.group_id = ${products.groupId}
      )
    )`;

    const conditions: ReturnType<typeof eq>[] = [isGroupRepresentative as any];
    if (categoryId) conditions.push(eq(products.categoryId, categoryId) as any);
    if (brand) conditions.push(ilike(products.brand, `%${brand}%`) as any);
    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.brand, `%${search}%`),
          ilike(products.model, `%${search}%`),
        ) as any,
      );
    }
    if (minPrice !== undefined) {
      conditions.push(sql`${groupMinPriceSub} >= ${minPrice}` as any);
    }
    if (maxPrice !== undefined) {
      conditions.push(sql`${groupMaxPriceSub} <= ${maxPrice}` as any);
    }

    const where = and(...conditions);

    const [rows, countResult] = await Promise.all([
      this.db
        .select({
          id: products.id,
          groupId: products.groupId,
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
          // 그룹 정보 (있을 경우)
          group: {
            id: productGroups.id,
            name: productGroups.name,
            slug: productGroups.slug,
          },
          // 가격 범위
          minPrice: groupMinPriceSub,
          maxPrice: groupMaxPriceSub,
          currency: groupCurrencySub,
          previousMinPrice: previousGroupMinPriceSub,
          // 스토어 정보
          storeCount: groupStoreCountSub,
          storeNames: groupStoreNamesSub,
          createdAt: products.createdAt,
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(productGroups, eq(products.groupId, productGroups.id))
        .where(where)
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset),

      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(where),
    ]);

    return {
      data: rows,
      meta: {
        total: countResult[0].count,
        page,
        limit,
        totalPages: Math.ceil(countResult[0].count / limit),
      },
    };
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
