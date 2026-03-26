import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { CRAWL_QUEUE } from './constants';
import { CrawlerProcessor } from './crawler.processor';
import { CrawlerScheduler } from './crawler.scheduler';
import { CrawlerService } from './crawler.service';
import { CrawlerController } from './crawler.controller';
import { AdapterFactory } from './adapters/adapter.factory';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { PriceIngestionService } from './services/price-ingestion.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
      name: CRAWL_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    }),
  ],
  controllers: [CrawlerController],
  providers: [
    CrawlerService,
    CrawlerScheduler,
    CrawlerProcessor,
    AdapterFactory,
    CircuitBreakerService,
    PriceIngestionService,
  ],
  exports: [CrawlerService],
})
export class CrawlerModule {}
