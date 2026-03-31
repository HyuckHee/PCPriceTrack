import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { BuildsService } from './builds.service';
import { EstimateBuildDto } from './dto/estimate-build.dto';
import { SaveBuildDto } from './dto/save-build.dto';

@Public()
@Controller('builds')
export class BuildsController {
  constructor(private readonly buildsService: BuildsService) {}

  /** POST /api/builds/estimate — compute optimal component set for a given budget */
  @Post('estimate')
  estimate(@Body() dto: EstimateBuildDto) {
    return this.buildsService.estimate(dto);
  }

  /** POST /api/builds — persist a build to the database */
  @Post()
  save(@Body() dto: SaveBuildDto) {
    return this.buildsService.save(dto);
  }

  /** GET /api/builds — list recently saved builds */
  @Get()
  findAll(@Query('limit') limit?: string) {
    return this.buildsService.findAll(limit ? parseInt(limit, 10) : 20);
  }

  /** GET /api/builds/:id — fetch a single saved build */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.buildsService.findById(id);
  }
}
