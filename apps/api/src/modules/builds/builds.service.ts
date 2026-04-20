import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { Database, DATABASE_TOKEN } from '../../database/database.provider';
import { pcBuilds } from '../../database/schema/pc-builds';
import { EstimateBuildDto } from './dto/estimate-build.dto';
import { SaveBuildDto } from './dto/save-build.dto';

// Budget allocation per category (must sum to 1.0)
const BUDGET_RATIO: Record<string, number> = {
  gpu: 0.35,
  cpu: 0.20,
  motherboard: 0.15,
  ram: 0.10,
  psu: 0.08,
  ssd: 0.08,
  cooler: 0.04,
};

const CATEGORY_LABELS: Record<string, string> = {
  gpu: '그래픽카드',
  cpu: 'CPU',
  ram: '메모리',
  ssd: 'SSD/HDD',
  motherboard: '메인보드',
  psu: '파워',
  cooler: '쿨러',
};

// Some estimator slots map to multiple DB category slugs (e.g. ssd covers both ssd + hdd)
const CATEGORY_DB_SLUGS: Record<string, string[]> = {
  gpu: ['gpu'],
  cpu: ['cpu'],
  ram: ['ram'],
  ssd: ['ssd', 'hdd'],
  motherboard: ['motherboard'],
  psu: ['psu'],
  cooler: ['cooler'],
};

@Injectable()
export class BuildsService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async estimate(dto: EstimateBuildDto) {
    const { budget, currency = 'USD', ratios: customRatios } = dto;

    // Merge custom ratios with defaults; normalise so they sum to 1.0
    let effectiveRatio: Record<string, number> = { ...BUDGET_RATIO };
    if (customRatios && Object.keys(customRatios).length > 0) {
      // Only accept keys that exist in BUDGET_RATIO
      const merged: Record<string, number> = {};
      for (const key of Object.keys(BUDGET_RATIO)) {
        merged[key] = customRatios[key] ?? BUDGET_RATIO[key];
      }
      const total = Object.values(merged).reduce((s, v) => s + v, 0);
      if (total > 0) {
        for (const key of Object.keys(merged)) {
          merged[key] = merged[key] / total;
        }
      }
      effectiveRatio = merged;
    }

    // For each category, find the best (most expensive ≤ budget) product
    // whose latest price record was within the last 14 days and is in stock.
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const components = await Promise.all(
      Object.entries(effectiveRatio).map(async ([categorySlug, ratio]) => {
        const allocation = budget * ratio;
        const dbSlugs = CATEGORY_DB_SLUGS[categorySlug] ?? [categorySlug];
        const slugCond =
          dbSlugs.length === 1
            ? sql`c.slug = ${dbSlugs[0]}`
            : sql`c.slug = ANY(ARRAY[${sql.raw(dbSlugs.map((s) => `'${s}'`).join(', '))}])`;

        const rows = await this.db.execute(sql`
          WITH latest_price AS (
            SELECT DISTINCT ON (pr.listing_id)
              pl.product_id,
              pl.url                      AS store_url,
              s.name                      AS store_name,
              pr.price::numeric           AS price,
              pr.original_price::numeric  AS original_price,
              pr.currency,
              pr.in_stock,
              pr.recorded_at
            FROM price_records pr
            INNER JOIN product_listings pl ON pr.listing_id = pl.id
            INNER JOIN stores s ON pl.store_id = s.id
            INNER JOIN products p ON pl.product_id = p.id
            INNER JOIN categories c ON p.category_id = c.id
            WHERE ${slugCond}
              AND pl.is_active = true
              AND pr.recorded_at >= ${twoWeeksAgo.toISOString()}
              AND pr.in_stock = true
              AND pr.currency = ${currency}
              AND pr.price::numeric > 0
            ORDER BY pr.listing_id, pr.recorded_at DESC
          ),
          best_per_product AS (
            SELECT DISTINCT ON (product_id)
              product_id,
              store_url,
              store_name,
              price,
              original_price,
              currency,
              in_stock
            FROM latest_price
            WHERE price <= ${allocation}
            ORDER BY product_id, price DESC
          )
          SELECT
            p.id            AS "productId",
            p.name          AS "productName",
            p.slug,
            p.brand,
            p.image_url     AS "imageUrl",
            b.store_url     AS "storeUrl",
            b.store_name    AS "storeName",
            b.price,
            b.original_price AS "originalPrice",
            b.currency,
            b.in_stock      AS "inStock"
          FROM best_per_product b
          INNER JOIN products p ON p.id = b.product_id
          ORDER BY b.price DESC
          LIMIT 1
        `);

        const row = rows.rows[0] as Record<string, unknown> | undefined;
        if (!row) return null;

        const price = Number(row.price);
        const origPrice = row.originalPrice ? Number(row.originalPrice) : null;
        return {
          category: categorySlug,
          categoryName: CATEGORY_LABELS[categorySlug],
          productId: String(row.productId),
          productName: String(row.productName),
          slug: String(row.slug),
          brand: String(row.brand),
          imageUrl: row.imageUrl ? String(row.imageUrl) : null,
          price,
          originalPrice: origPrice && origPrice > price ? origPrice : null,
          currency: String(row.currency),
          storeUrl: row.storeUrl ? String(row.storeUrl) : null,
          storeName: row.storeName ? String(row.storeName) : null,
          inStock: Boolean(row.inStock),
          budgetAllocation: allocation,
        };
      }),
    );

    const found = components.filter(Boolean);
    const totalPrice = found.reduce((sum, c) => sum + (c?.price ?? 0), 0);

    return {
      budget,
      currency,
      totalPrice,
      components: found,
    };
  }

  async alternatives(
    category: string,
    budget: number,
    currency: string,
    excludeId?: string,
    limit = 5,
  ) {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const limitNum = Math.min(Math.max(1, limit), 10);

    const dbSlugs = CATEGORY_DB_SLUGS[category] ?? [category];
    const slugCond =
      dbSlugs.length === 1
        ? sql`c.slug = ${dbSlugs[0]}`
        : sql`c.slug = ANY(ARRAY[${sql.raw(dbSlugs.map((s) => `'${s}'`).join(', '))}])`;

    const rows = await this.db.execute(sql`
      WITH latest_price AS (
        SELECT DISTINCT ON (pr.listing_id)
          pl.product_id,
          pl.url                      AS store_url,
          s.name                      AS store_name,
          pr.price::numeric           AS price,
          pr.original_price::numeric  AS original_price,
          pr.currency,
          pr.in_stock,
          pr.recorded_at
        FROM price_records pr
        INNER JOIN product_listings pl ON pr.listing_id = pl.id
        INNER JOIN stores s ON pl.store_id = s.id
        INNER JOIN products p ON pl.product_id = p.id
        INNER JOIN categories c ON p.category_id = c.id
        WHERE ${slugCond}
          AND pl.is_active = true
          AND pr.recorded_at >= ${twoWeeksAgo.toISOString()}
          AND pr.in_stock = true
          AND pr.currency = ${currency}
          AND pr.price::numeric > 0
        ORDER BY pr.listing_id, pr.recorded_at DESC
      ),
      best_per_product AS (
        SELECT DISTINCT ON (product_id)
          product_id,
          store_url,
          store_name,
          price,
          original_price,
          currency,
          in_stock
        FROM latest_price
        WHERE price <= ${budget}
        ORDER BY product_id, price DESC
      )
      SELECT
        p.id            AS "productId",
        p.name          AS "productName",
        p.slug,
        p.brand,
        p.image_url     AS "imageUrl",
        p.performance_score AS "performanceScore",
        b.store_url     AS "storeUrl",
        b.store_name    AS "storeName",
        b.price,
        b.original_price AS "originalPrice",
        b.currency,
        b.in_stock      AS "inStock"
      FROM best_per_product b
      INNER JOIN products p ON p.id = b.product_id
      ${excludeId ? sql`WHERE p.id != ${excludeId}` : sql``}
      ORDER BY b.price DESC
      LIMIT ${limitNum}
    `);

    return (rows.rows as Record<string, unknown>[]).map((row) => ({
      category,
      categoryName: CATEGORY_LABELS[category] ?? category,
      productId: String(row.productId),
      productName: String(row.productName),
      slug: String(row.slug),
      brand: String(row.brand),
      imageUrl: row.imageUrl ? String(row.imageUrl) : null,
      price: Number(row.price),
      originalPrice: row.originalPrice && Number(row.originalPrice) > Number(row.price)
        ? Number(row.originalPrice) : null,
      currency: String(row.currency),
      storeUrl: row.storeUrl ? String(row.storeUrl) : null,
      storeName: row.storeName ? String(row.storeName) : null,
      inStock: Boolean(row.inStock),
      performanceScore: row.performanceScore != null ? Number(row.performanceScore) : null,
    }));
  }

  async save(dto: SaveBuildDto, userId?: string) {
    const [build] = await this.db
      .insert(pcBuilds)
      .values({
        userId: userId ?? null,
        name: dto.name ?? '나의 조립 PC',
        budget: String(dto.budget),
        currency: dto.currency ?? 'USD',
        totalPrice: dto.totalPrice != null ? String(dto.totalPrice) : null,
        components: dto.components,
      })
      .returning();

    return build;
  }

  async findAll(limit = 20, userId: string) {
    return this.db
      .select()
      .from(pcBuilds)
      .where(eq(pcBuilds.userId, userId))
      .orderBy(desc(pcBuilds.createdAt))
      .limit(limit);
  }

  async findById(id: string, userId: string) {
    const [build] = await this.db
      .select()
      .from(pcBuilds)
      .where(and(eq(pcBuilds.id, id), eq(pcBuilds.userId, userId)))
      .limit(1);
    return build ?? null;
  }

  async remove(id: string, userId: string) {
    await this.db
      .delete(pcBuilds)
      .where(and(eq(pcBuilds.id, id), eq(pcBuilds.userId, userId)));
    return { success: true };
  }
}
