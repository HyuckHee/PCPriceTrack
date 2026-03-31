import { Module } from '@nestjs/common';
import { BuildsService } from './builds.service';
import { BuildsController } from './builds.controller';

@Module({
  providers: [BuildsService],
  controllers: [BuildsController],
})
export class BuildsModule {}
