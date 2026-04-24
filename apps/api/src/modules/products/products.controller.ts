import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ListProductsDto } from './dto/list-products.dto';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  list(@Query() dto: ListProductsDto) {
    return this.productsService.list(dto);
  }

  @Get('deals')
  deals(@Query('limit') limit?: string, @Query('categoryId') categoryId?: string) {
    return this.productsService.deals(limit ? parseInt(limit) : 20, categoryId);
  }

  @Get('autocomplete')
  autocomplete(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.productsService.autocomplete(q ?? '', limit ? parseInt(limit) : 5);
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
