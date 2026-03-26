import { Controller, Get, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, DATABASE_TOKEN } from '../../database/database.provider';
import { categories } from '../../database/schema/categories';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('categories')
export class CategoriesController {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  @Get()
  async list() {
    return this.db.select().from(categories).orderBy(categories.name);
  }
}
