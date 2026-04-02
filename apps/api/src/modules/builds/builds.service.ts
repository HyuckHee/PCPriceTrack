import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { Database, DATABASE_TOKEN } from '../../database/database.provider';
import { pcBuilds } from '../../database/schema/pc-builds';
import { EstimateBuildDto } from './dto/estimate-build.dto';
import { SaveBuildDto } from './dto/save-build.dto';

// Budget allocation per category (must sum to 1.0)
const BUDGET_RATIO: Record<string, number> = {
  gpu: 0.40,
  cpu: 0.25,
  ram: 0.20,
  ssd: 0.15,
};

const CATEGORY_LABELS: Record<string, string> = {
  gpu: '그래픽카드',
  cpu: 'CPU',
  ram: '메모리',
  ssd: 'SSD',
};

@Injectable()
export class BuildsService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async estimate(dto: EstimateBuildDto) {
    const { budget, currency = 'USD' } = dto;

    // For each category, find the best (most expensive ≤ budget) product
    // whose latest price record was within the last 14 days and is in stock.
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const components = await Promise.all(
      Object.entries(BUDGET_RATIO).map(async ([categorySlug, ratio]) => {
        const allocation = budget * ratio;

        const rows = await this.db.execute(sql`
          WITH latest_price AS (
            SELECT DISTINCT ON (pr.listing_id)
              pl.product_id,
              pl.url         AS store_url,
              s.name         AS store_name,
              pr.price::numeric  AS price,
              pr.currency,
              pr.in_stock,
              pr.recorded_at
            FROM price_records pr
            INNER JOIN product_listings pl ON pr.listing_id = pl.id
            INNER JOIN stores s ON pl.store_id = s.id
            INNER JOIN products p ON pl.product_id = p.id
            INNER JOIN categories c ON p.category_id = c.id
            WHERE c.slug = ${categorySlug}
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
            b.currency,
            b.in_stock      AS "inStock"
          FROM best_per_product b
          INNER JOIN products p ON p.id = b.product_id
          ORDER BY b.price DESC
          LIMIT 1
        `);

        const row = rows.rows[0] as Record<string, unknown> | undefined;
        if (!row) return null;

        return {
          category: categorySlug,
          categoryName: CATEGORY_LABELS[categorySlug],
          productId: String(row.productId),
          productName: String(row.productName),
          slug: String(row.slug),
          brand: String(row.brand),
          imageUrl: row.imageUrl ? String(row.imageUrl) : null,
          price: Number(row.price),
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
