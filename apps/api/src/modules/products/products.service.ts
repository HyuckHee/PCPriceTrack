import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { Database, DATABASE_TOKEN } from '../../database/database.provider';
import { products } from '../../database/schema/products';
import { categories } from '../../database/schema/categories';
import { productListings } from '../../database/schema/product-listings';
import { priceRecords } from '../../database/schema/price-records';
import { stores } from '../../database/schema/stores';
import { ListProductsDto } from './dto/list-products.dto';

@Injectable()
export class ProductsService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async list(dto: ListProductsDto) {
    const { page = 1, limit = 20, categoryId, brand, search, minPrice, maxPrice } = dto;
    const offset = (page - 1) * limit;

    // Subquery: lowest current price for a product
    const lowestPriceSub = sql<string>`(
      SELECT MIN(pr.price::numeric)
      FROM price_records pr
      INNER JOIN product_listings pl ON pr.listing_id = pl.id
      WHERE pl.product_id = ${products.id}
        AND pr.recorded_at = (
          SELECT MAX(pr2.recorded_at) FROM price_records pr2 WHERE pr2.listing_id = pl.id
        )
    )`;

    // Subquery: currency of the lowest-priced listing's latest record
    const lowestCurrencySub = sql<string>`(
      SELECT pr.currency
      FROM price_records pr
      INNER JOIN product_listings pl ON pr.listing_id = pl.id
      WHERE pl.product_id = ${products.id}
        AND pr.recorded_at = (
          SELECT MAX(pr2.recorded_at) FROM price_records pr2 WHERE pr2.listing_id = pl.id
        )
      ORDER BY pr.price::numeric ASC
      LIMIT 1
    )`;

    // Subquery: lowest price from the PREVIOUS crawl (rn=2) for discount calculation
    const previousLowestPriceSub = sql<string>`(
      SELECT MIN(rn2.price) FROM (
        SELECT pr.price::numeric AS price,
               RANK() OVER (PARTITION BY pr.listing_id ORDER BY pr.recorded_at DESC) AS rn
        FROM price_records pr
        INNER JOIN product_listings pl ON pr.listing_id = pl.id
        WHERE pl.product_id = ${products.id}
      ) AS rn2 WHERE rn2.rn = 2
    )`;

    // Subquery: store names that have this product listed (comma-separated)
    const storeNamesSub = sql<string>`(
      SELECT STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name)
      FROM product_listings pl
      INNER JOIN stores s ON pl.store_id = s.id
      WHERE pl.product_id = ${products.id}
        AND pl.is_active = true
    )`;

    // Subquery: original (list/MSRP) price from the most recent crawl with originalPrice set
    const originalPriceSub = sql<string>`(
      SELECT pr.original_price::numeric
      FROM price_records pr
      INNER JOIN product_listings pl ON pr.listing_id = pl.id
      WHERE pl.product_id = ${products.id}
        AND pr.original_price IS NOT NULL
      ORDER BY pr.recorded_at DESC
      LIMIT 1
    )`;

    const conditions = [];
    if (categoryId) conditions.push(eq(products.categoryId, categoryId));
    if (brand) conditions.push(ilike(products.brand, `%${brand}%`));
    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.brand, `%${search}%`),
          ilike(products.model, `%${search}%`),
        ),
      );
    }
    if (minPrice !== undefined) {
      conditions.push(sql`${lowestPriceSub} >= ${minPrice}`);
    }
    if (maxPrice !== undefined) {
      conditions.push(sql`${lowestPriceSub} <= ${maxPrice}`);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      this.db
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
          lowestPrice: lowestPriceSub,
          lowestCurrency: lowestCurrencySub,
          previousLowestPrice: previousLowestPriceSub,
          originalPrice: originalPriceSub,
          storeNames: storeNamesSub,
          createdAt: products.createdAt,
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
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

  async deals(limit = 20, categoryId?: string) {
    // Products where current price < store's MSRP (original_price)
    // Only include listings that have an originalPrice to avoid stale/corrupt rn=2 data
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
          -- 통화별 합리적 가격 범위 (오염 데이터 제외)
          AND (
            (currency = 'USD' AND current_price BETWEEN 1 AND 7000 AND original_price BETWEEN 1 AND 7000)
            OR
            (currency = 'KRW' AND current_price BETWEEN 1000 AND 10000000 AND original_price BETWEEN 1000 AND 10000000)
          )
          -- 정가가 현재가의 3배 초과면 비정상
          AND original_price <= current_price * 3
        ORDER BY product_id, ((original_price - current_price) / original_price) DESC
      )
      SELECT
        p.id, p.name, p.brand, p.slug, p.image_url AS "imageUrl",
        c.name AS "categoryName", c.slug AS "categorySlug",
        b.current_price AS "currentPrice",
        b.original_price AS "previousPrice",
        b.original_price AS "originalPrice",
        b.currency AS "currency"
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      INNER JOIN best_per_product b ON b.product_id = p.id
      ${categoryId ? sql`WHERE p.category_id = ${categoryId}` : sql``}
      ORDER BY ((b.original_price - b.current_price) / b.original_price) DESC
      LIMIT ${limit}
    `);

    return rows.rows;
  }

  async findBySlug(slug: string) {
    const product = await this.db
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
      .where(eq(products.slug, slug))
      .limit(1);

    if (!product[0]) throw new NotFoundException('Product not found');

    // Latest price per active listing
    const listings = await this.db
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
          ORDER BY pr.recorded_at DESC
          LIMIT 1
        )`,
        latestCurrency: sql<string>`(
          SELECT pr.currency FROM price_records pr
          WHERE pr.listing_id = ${productListings.id}
          ORDER BY pr.recorded_at DESC
          LIMIT 1
        )`,
        latestOriginalPrice: sql<string>`(
          SELECT pr.original_price FROM price_records pr
          WHERE pr.listing_id = ${productListings.id}
            AND pr.original_price IS NOT NULL
          ORDER BY pr.recorded_at DESC
          LIMIT 1
        )`,
        inStock: sql<boolean>`(
          SELECT pr.in_stock FROM price_records pr
          WHERE pr.listing_id = ${productListings.id}
          ORDER BY pr.recorded_at DESC
          LIMIT 1
        )`,
      })
      .from(productListings)
      .innerJoin(stores, eq(productListings.storeId, stores.id))
      .where(and(eq(productListings.productId, product[0].id), eq(productListings.isActive, true)));

    return { ...product[0], listings };
  }

  async priceHistory(slug: string, days: number = 30) {
    const product = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (!product[0]) throw new NotFoundException('Product not found');

    const since = new Date();
    since.setDate(since.getDate() - days);

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
      })
      .from(priceRecords)
      .innerJoin(productListings, eq(priceRecords.listingId, productListings.id))
      .innerJoin(stores, eq(productListings.storeId, stores.id))
      .where(
        and(
          eq(productListings.productId, product[0].id),
          sql`${priceRecords.recordedAt} >= ${since}`,
        ),
      )
      .orderBy(desc(priceRecords.recordedAt));

    return rows;
  }
}
