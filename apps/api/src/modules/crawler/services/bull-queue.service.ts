import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job as BullJob } from 'bull';
import { CRAWL_QUEUE } from '../constants';
import { Job, JobOptions } from './in-memory-queue.service';
import { IQueueService } from './queue.interface';

/**
 * Bull(Redis) 기반 큐 — REDIS_MODE=local|upstash 일 때 사용.
 * InMemoryQueueService와 동일한 IQueueService 인터페이스를 구현합니다.
 */
@Injectable()
export class BullQueueService implements IQueueService {
  private readonly logger = new Logger(BullQueueService.name);

  constructor(
    @InjectQueue(CRAWL_QUEUE) private readonly bullQueue: Queue,
  ) {}

  registerHandler<T>(name: string, handler: (job: Job<T>) => Promise<unknown>): void {
    this.bullQueue.process(name, async (bullJob: BullJob<T>) => {
      return handler(this.toBridgeJob(bullJob));
    });
    this.logger.debug(`Bull processor registered: "${name}"`);
  }

  onFailed<T>(handler: (job: Job<T>, err: Error) => Promise<void>): void {
    this.bullQueue.on('failed', async (bullJob: BullJob<T>, err: Error) => {
      await handler(this.toBridgeJob(bullJob), err).catch(() => {});
    });
  }

  onCompleted<T>(handler: (job: Job<T>, result: unknown) => void): void {
    this.bullQueue.on('completed', (bullJob: BullJob<T>, result: unknown) => {
      handler(this.toBridgeJob(bullJob), result);
    });
  }

  async add<T>(name: string, data: T, opts: JobOptions = {}): Promise<{ id: string }> {
    const bullJob = await this.bullQueue.add(name, data, {
      attempts: opts.attempts,
      backoff: opts.backoff,
      removeOnComplete: opts.removeOnComplete ?? 50,
      removeOnFail: opts.removeOnFail ?? 100,
    });
    this.logger.debug(`Bull job enqueued: ${name} [${bullJob.id}]`);
    return { id: String(bullJob.id) };
  }

  async getWaitingCount(): Promise<number> {
    return this.bullQueue.getWaitingCount();
  }

  /** Bull Job → 공통 Job 인터페이스로 변환 */
  private toBridgeJob<T>(bullJob: BullJob<T>): Job<T> {
    return {
      id: String(bullJob.id),
      name: bullJob.name,
      data: bullJob.data,
      attemptsMade: bullJob.attemptsMade,
      opts: { attempts: bullJob.opts.attempts ?? 1 },
    };
  }
}
