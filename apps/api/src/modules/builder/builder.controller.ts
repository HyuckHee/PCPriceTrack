import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { BuilderService } from './builder.service';
import { EstimateRequestDto } from './dto/estimate.dto';

@Controller('builder')
export class BuilderController {
  constructor(private readonly builderService: BuilderService) {}

  @Post('estimate')
  estimate(@Body() dto: EstimateRequestDto) {
    return this.builderService.estimate(dto);
  }
}
