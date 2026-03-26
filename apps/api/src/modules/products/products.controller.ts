import { Controller, Get, Param, Query } from '@nestjs/common';
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
}
