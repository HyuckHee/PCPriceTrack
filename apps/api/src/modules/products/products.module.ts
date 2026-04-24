import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoriesController } from './categories.controller';
import { FacetsService } from './facets.service';
import { FacetsController } from './facets.controller';

@Module({
  providers: [ProductsService, FacetsService],
  controllers: [ProductsController, CategoriesController, FacetsController],
})
export class ProductsModule {}
