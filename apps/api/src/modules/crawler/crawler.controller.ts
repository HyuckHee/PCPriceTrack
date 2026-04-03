import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { IsString, IsUUID, IsArray } from 'class-validator';
import { CrawlerService } from './crawler.service';
import { AdminKeyGuard } from '../../common/guards/admin-key.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

class TriggerStoreDto {
  @IsUUID() storeId!: string;
}

class TriggerTargetedDto {
  @IsUUID() storeId!: string;
  @IsArray() @IsString({ each: true }) listingIds!: string[];
}

class TriggerDiscoveryDto {
  @IsUUID() storeId!: string;
  @IsString() categorySlug!: string;
}

/**
 * Admin-only crawler management endpoints.
 * x-admin-key 헤더로 인증 (JWT 불필요).
 */
@Public()
@Controller('admin/crawler')
@UseGuards(AdminKeyGuard)
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  /** GET /api/admin/crawler/status — all store statuses + circuit breaker states */
  @Get('status')
  async getStatus() {
    return this.crawlerService.getStoreStatuses();
  }

  /** GET /api/admin/crawler/jobs — last 50 crawl job records */
  @Get('jobs')
  async getRecentJobs() {
    return this.crawlerService.getRecentJobs(50);
  }

  /** POST /api/admin/crawler/trigger/all — manually trigger all stores */
  @Post('trigger/all')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerAll() {
    const result = await this.crawlerService.enqueueAllStores({ triggeredBy: 'manual' });
    return { message: `Enqueued ${result.enqueued} store crawl(s)`, ...result };
  }

  /** POST /api/admin/crawler/trigger/store — trigger a single store */
  @Post('trigger/store')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerStore(@Body() body: TriggerStoreDto) {
    const result = await this.crawlerService.enqueueStore(body.storeId, {
      triggeredBy: 'manual',
    });
    return { message: 'Crawl job enqueued', ...result };
  }

  /** POST /api/admin/crawler/trigger/targeted — re-crawl specific listings */
  @Post('trigger/targeted')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerTargeted(@Body() body: TriggerTargetedDto) {
    const result = await this.crawlerService.enqueueTargeted(
      body.storeId,
      body.listingIds,
      { triggeredBy: 'manual' },
    );
    return { message: 'Targeted crawl job enqueued', ...result };
  }

  /** POST /api/admin/crawler/trigger/discovery — discover new products for a store + category */
  @Post('trigger/discovery')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerDiscovery(@Body() body: TriggerDiscoveryDto) {
    const result = await this.crawlerService.enqueueDiscovery(
      body.storeId,
      body.categorySlug,
      { triggeredBy: 'manual' },
    );
    return { message: 'Discovery job enqueued', ...result };
  }

  /** POST /api/admin/crawler/circuit/:storeId/reset — reset a store's circuit breaker */
  @Post('circuit/:storeId/reset')
  @HttpCode(HttpStatus.OK)
  async resetCircuit(@Param('storeId', ParseUuidPipe) storeId: string) {
    await this.crawlerService.resetCircuit(storeId);
    return { message: `Circuit breaker reset for store ${storeId}` };
  }
}
