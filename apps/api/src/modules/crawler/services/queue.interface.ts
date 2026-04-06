import { Job, JobOptions } from './in-memory-queue.service';

export const QUEUE_SERVICE = 'QUEUE_SERVICE';

type JobHandler<T> = (job: Job<T>) => Promise<unknown>;
type FailedHandler<T> = (job: Job<T>, err: Error) => Promise<void>;
type CompletedHandler<T> = (job: Job<T>, result: unknown) => void;

export interface IQueueService {
  add<T>(name: string, data: T, opts?: JobOptions): Promise<{ id: string }>;
  getWaitingCount(): Promise<number>;
  registerHandler<T>(name: string, handler: JobHandler<T>): void;
  onFailed<T>(handler: FailedHandler<T>): void;
  onCompleted<T>(handler: CompletedHandler<T>): void;
}
