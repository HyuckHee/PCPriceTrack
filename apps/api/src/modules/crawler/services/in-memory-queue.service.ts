import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface JobOptions {
  attempts?: number;
  backoff?: { type: 'exponential'; delay: number };
  removeOnComplete?: number;
  removeOnFail?: number;
}

export interface Job<T = unknown> {
  id: string;
  name: string;
  data: T;
  attemptsMade: number;
  opts: { attempts: number };
}

type JobHandler<T> = (job: Job<T>) => Promise<unknown>;
type FailedHandler<T> = (job: Job<T>, err: Error) => Promise<void>;
type CompletedHandler<T> = (job: Job<T>, result: unknown) => void;

interface QueuedJob<T> {
  job: Job<T>;
  opts: Required<Pick<JobOptions, 'attempts'>> & { backoff: { delay: number } };
}

@Injectable()
export class InMemoryQueueService {
  private readonly logger = new Logger(InMemoryQueueService.name);

  private readonly handlers = new Map<string, JobHandler<unknown>>();
  private onFailedHandler: FailedHandler<unknown> | null = null;
  private onCompletedHandler: CompletedHandler<unknown> | null = null;

  private readonly waiting: QueuedJob<unknown>[] = [];
  private activeCount = 0;
  private readonly maxConcurrency = 3;

  // ─── 등록 ────────────────────────────────────────────────────────────────

  registerHandler<T>(name: string, handler: JobHandler<T>): void {
    this.handlers.set(name, handler as JobHandler<unknown>);
  }

  onFailed<T>(handler: FailedHandler<T>): void {
    this.onFailedHandler = handler as FailedHandler<unknown>;
  }

  onCompleted<T>(handler: CompletedHandler<T>): void {
    this.onCompletedHandler = handler as CompletedHandler<unknown>;
  }

  // ─── Job 추가 ─────────────────────────────────────────────────────────────

  async add<T>(name: string, data: T, opts: JobOptions = {}): Promise<{ id: string }> {
    const job: Job<T> = {
      id: randomUUID(),
      name,
      data,
      attemptsMade: 0,
      opts: { attempts: opts.attempts ?? 1 },
    };

    const queuedJob: QueuedJob<T> = {
      job: job as Job<unknown>,
      opts: {
        attempts: opts.attempts ?? 1,
        backoff: { delay: opts.backoff?.delay ?? 5000 },
      },
    };

    this.waiting.push(queuedJob);
    this.logger.debug(`Job enqueued: ${name} [${job.id.slice(0, 8)}] | waiting=${this.waiting.length}`);

    // 비동기로 워커 실행 (add()는 즉시 반환)
    setImmediate(() => this.tick());

    return { id: job.id };
  }

  // ─── 상태 조회 ────────────────────────────────────────────────────────────

  async getWaitingCount(): Promise<number> {
    return this.waiting.length;
  }

  async getActiveCount(): Promise<number> {
    return this.activeCount;
  }

  // ─── 내부: 처리 루프 ──────────────────────────────────────────────────────

  private tick(): void {
    while (this.activeCount < this.maxConcurrency && this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      this.activeCount++;
      this.process(next).finally(() => {
        this.activeCount--;
        this.tick(); // 완료 후 다음 job 처리
      });
    }
  }

  private async process(queued: QueuedJob<unknown>): Promise<void> {
    const { job, opts } = queued;
    const handler = this.handlers.get(job.name);

    if (!handler) {
      this.logger.warn(`No handler registered for job name: "${job.name}"`);
      return;
    }

    for (let attempt = 1; attempt <= opts.attempts; attempt++) {
      job.attemptsMade = attempt - 1;

      try {
        this.logger.debug(`Running job ${job.name} [${job.id.slice(0, 8)}] attempt ${attempt}/${opts.attempts}`);
        const result = await handler(job);
        this.onCompletedHandler?.(job, result);
        return; // 성공
      } catch (err) {
        const error = err as Error;
        this.logger.warn(
          `Job ${job.name} [${job.id.slice(0, 8)}] attempt ${attempt}/${opts.attempts} failed: ${error.message}`,
        );

        const isFinal = attempt >= opts.attempts;
        job.attemptsMade = attempt;

        await this.onFailedHandler?.(job, error).catch(() => {});

        if (!isFinal) {
          const delay = opts.backoff.delay * Math.pow(2, attempt - 1);
          this.logger.debug(`Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, Math.min(delay, 60_000)));
        }
      }
    }
  }
}
