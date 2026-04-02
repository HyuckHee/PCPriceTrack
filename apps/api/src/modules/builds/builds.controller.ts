import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
}
