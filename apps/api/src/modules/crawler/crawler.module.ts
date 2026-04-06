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
import { InMemoryQueueService } from './services/in-memory-queue.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [CrawlerController],
  providers: [
    InMemoryQueueService,
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
