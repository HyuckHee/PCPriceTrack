import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CrawlerProcessor } from './crawler.processor';
import { CrawlerScheduler } from './crawler.scheduler';
import { CrawlerService } from './crawler.service';
import { CrawlerController } from './crawler.controller';
import { AdapterFactory } from './adapters/adapter.factory';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { PriceIngestionService } from './services/price-ingestion.service';
import { CrawlerScheduleService } from './services/crawler-schedule.service';
import { QueueModule } from './services/queue.module';

@Module({
  imports: [ScheduleModule.forRoot(), QueueModule.register()],
  controllers: [CrawlerController],
  providers: [
    CrawlerService,
    CrawlerScheduler,
    CrawlerProcessor,
    AdapterFactory,
    CircuitBreakerService,
    PriceIngestionService,
    CrawlerScheduleService,
  ],
  exports: [CrawlerService],
})
export class CrawlerModule {}
