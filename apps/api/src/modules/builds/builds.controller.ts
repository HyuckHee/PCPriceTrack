import { Body, Controller, Delete, Get, Param, ParseFloatPipe, Post, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SafeUser } from '../../database/schema/users';
import { BuildsService } from './builds.service';
import { EstimateBuildDto } from './dto/estimate-build.dto';
import { SaveBuildDto } from './dto/save-build.dto';

@Controller('builds')
export class BuildsController {
  constructor(private readonly buildsService: BuildsService) {}

  /** POST /api/builds/estimate — 로그인 없이도 견적 계산 가능 */
  @Public()
  @Post('estimate')
  estimate(@Body() dto: EstimateBuildDto) {
    return this.buildsService.estimate(dto);
  }

  /** POST /api/builds — 로그인한 유저의 견적 저장 */
  @Post()
  save(@Body() dto: SaveBuildDto, @CurrentUser() user: SafeUser) {
    return this.buildsService.save(dto, user.id);
  }

  /** GET /api/builds/alternatives?category=gpu&budget=400&currency=USD&excludeId=xxx */
  @Public()
  @Get('alternatives')
  alternatives(
    @Query('category') category: string,
    @Query('budget', ParseFloatPipe) budget: number,
    @Query('currency') currency: string,
    @Query('excludeId') excludeId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.buildsService.alternatives(
      category,
      budget,
      currency ?? 'USD',
      excludeId,
      limit ? parseInt(limit, 10) : 5,
    );
  }

  /** GET /api/builds — 로그인한 유저의 견적만 조회 */
  @Get()
  findAll(@Query('limit') limit: string | undefined, @CurrentUser() user: SafeUser) {
    return this.buildsService.findAll(limit ? parseInt(limit, 10) : 20, user.id);
  }

  /** GET /api/builds/:id — 본인 견적만 조회 */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.buildsService.findById(id, user.id);
  }

  /** DELETE /api/builds/:id — 본인 견적 삭제 */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.buildsService.remove(id, user.id);
  }
}
