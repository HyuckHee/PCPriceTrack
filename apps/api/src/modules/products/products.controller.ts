import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ListProductsDto } from './dto/list-products.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Database, DATABASE_TOKEN } from '../../database/database.provider';
import { sql } from 'drizzle-orm';

@Public()
@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    @Inject(DATABASE_TOKEN) private db: Database,
  ) {}

  @Get('debug')
  async debug() {
    try {
      const r1 = await this.db.execute(sql`SELECT COUNT(*) FROM products`);
      const r2 = await this.db.execute(sql`SELECT COUNT(*) FROM product_groups`);
      const r3 = await this.db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'group_id'`);
      return { products: r1.rows[0], groups: r2.rows[0], hasGroupId: r3.rows.length > 0 };
    } catch (e) {
      return { error: String(e), msg: (e as Error).message };
    }
  }

  @Get('debug2')
  async debug2() {
    try {
      const r = await this.db.execute(sql`
        SELECT p.id, p.name FROM products p LIMIT 3
      `);
      return r.rows;
    } catch (e) {
      return { error: String(e), msg: (e as Error).message };
    }
  }

  @Get('debug3')
  async debug3() {
    try {
      const r = await this.db.execute(sql`
        WITH gp AS (
          SELECT COALESCE(p.group_id::text, p.id::text) AS group_key, COUNT(*) AS cnt
          FROM products p
          LEFT JOIN product_listings pl ON pl.product_id = p.id
          GROUP BY COALESCE(p.group_id::text, p.id::text)
        )
        SELECT * FROM gp LIMIT 3
      `);
      return r.rows;
    } catch (e) {
      return { error: String(e), msg: (e as Error).message };
    }
  }

  @Get()
  list(@Query() dto: ListProductsDto) {
    return this.productsService.list(dto);
  }

  @Get('deals')
  deals(@Query('limit') limit?: string, @Query('categoryId') categoryId?: string) {
    return this.productsService.deals(limit ? parseInt(limit) : 20, categoryId);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':slug/price-history')
  priceHistory(
    @Param('slug') slug: string,
    @Query('days') days?: string,
  ) {
    return this.productsService.priceHistory(slug, days ? parseInt(days) : 30);
  }

  /**
   * [Admin] 여러 제품을 하나의 그룹으로 묶습니다.
   *
   * POST /products/admin/merge-group
   * Body: { productIds: string[], groupName?: string }
   *
   * - productIds: 묶을 product ID 목록 (최소 2개)
   * - groupName:  그룹 대표 이름 (미지정 시 첫 번째 제품 이름 사용)
   */
  @Post('admin/merge-group')
  mergeGroup(
    @Body() body: { productIds: string[]; groupName?: string },
  ) {
    return this.productsService.mergeGroup(body.productIds, body.groupName);
  }
}
