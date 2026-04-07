import { DynamicModule, Logger, Module, Provider } from '@nestjs/common';
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
import { CrawlerScheduleService } from './services/crawler-schedule.service';
import { InMemoryQueueService } from './services/in-memory-queue.service';
import { BullQueueService } from './services/bull-queue.service';
import { QUEUE_SERVICE } from './services/queue.interface';

const REDIS_MODE = (process.env.REDIS_MODE ?? 'disabled') as 'disabled' | 'local' | 'upstash';
const logger = new Logger('CrawlerModule');

function buildRedisOptions() {
  if (REDIS_MODE === 'upstash') {
    return {
      redis: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        tls: { rejectUnauthorized: false },
      },
    };
  }
  return {
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    },
  };
}

@Module({})
export class CrawlerModule {
  static register(): DynamicModule {
    logger.log(`Queue mode: ${REDIS_MODE}`);

    const commonProviders: Provider[] = [
      CrawlerService,
      CrawlerScheduler,
      CrawlerProcessor,
      AdapterFactory,
      CircuitBreakerService,
      PriceIngestionService,
      CrawlerScheduleService,
    ];

    if (REDIS_MODE === 'disabled') {
      return {
        module: CrawlerModule,
        imports: [ScheduleModule.forRoot()],
        controllers: [CrawlerController],
        providers: [
          InMemoryQueueService,
          { provide: QUEUE_SERVICE, useExisting: InMemoryQueueService },
          ...commonProviders,
        ],
        exports: [CrawlerService],
      };
    }

    // local or upstash — Bull + Redis
    return {
      module: CrawlerModule,
      imports: [
        ScheduleModule.forRoot(),
        BullModule.forRoot(buildRedisOptions()),
        BullModule.registerQueue({
          name: CRAWL_QUEUE,
          defaultJobOptions: { removeOnComplete: 50, removeOnFail: 100 },
        }),
      ],
      controllers: [CrawlerController],
      providers: [
        BullQueueService,
        { provide: QUEUE_SERVICE, useExisting: BullQueueService },
        ...commonProviders,
      ],
      exports: [CrawlerService],
    };
  }
}
