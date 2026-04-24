import { Controller, Get, Query } from '@nestjs/common';
import { FacetsService } from './facets.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('products')
export class FacetsController {
  constructor(private facetsService: FacetsService) {}

  @Get('facets')
  getFacets(@Query('categoryId') categoryId: string) {
    return this.facetsService.getFacets(categoryId);
  }
}
