import { DynamicModule, Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CRAWL_QUEUE } from '../constants';
import { QUEUE_SERVICE } from './queue.interface';
import { InMemoryQueueService } from './in-memory-queue.service';
import { BullQueueService } from './bull-queue.service';

/**
 * REDIS_MODE 환경변수로 큐 구현체를 선택합니다.
 *
 *  disabled (기본값) — InMemoryQueueService (Redis 불필요)
 *  local             — Bull + 로컬 Redis (localhost:6379)
 *  upstash           — Bull + Upstash Redis (TLS, REDIS_HOST/PORT/PASSWORD)
 */
const REDIS_MODE = (process.env.REDIS_MODE ?? 'disabled') as 'disabled' | 'local' | 'upstash';

@Module({})
export class QueueModule {
  private static readonly logger = new Logger('QueueModule');

  static register(): DynamicModule {
    QueueModule.logger.log(`Queue mode: ${REDIS_MODE}`);

    if (REDIS_MODE === 'disabled') {
      return {
        module: QueueModule,
        providers: [
          InMemoryQueueService,
          { provide: QUEUE_SERVICE, useExisting: InMemoryQueueService },
        ],
        exports: [QUEUE_SERVICE],
      };
    }

    // local or upstash — Bull + Redis
    const redisOptions =
      REDIS_MODE === 'upstash'
        ? {
            redis: {
              host: process.env.REDIS_HOST ?? 'localhost',
              port: Number(process.env.REDIS_PORT ?? 6379),
              password: process.env.REDIS_PASSWORD || undefined,
              tls: { rejectUnauthorized: false },
            },
          }
        : {
            redis: {
              host: process.env.REDIS_HOST ?? 'localhost',
              port: Number(process.env.REDIS_PORT ?? 6379),
              password: process.env.REDIS_PASSWORD || undefined,
            },
          };

    return {
      module: QueueModule,
      imports: [
        BullModule.forRoot(redisOptions),
        BullModule.registerQueue({
          name: CRAWL_QUEUE,
          defaultJobOptions: { removeOnComplete: 50, removeOnFail: 100 },
        }),
      ],
      providers: [
        BullQueueService,
        { provide: QUEUE_SERVICE, useExisting: BullQueueService },
      ],
      exports: [QUEUE_SERVICE],
    };
  }
}
