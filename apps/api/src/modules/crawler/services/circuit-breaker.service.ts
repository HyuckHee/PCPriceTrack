import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  CB_FAILURE_THRESHOLD,
  CB_OPEN_TIMEOUT_SECONDS,
  CB_SUCCESS_THRESHOLD,
  CB_WINDOW_SECONDS,
  REDIS_CB_PREFIX,
} from '../constants';

export enum CircuitState {
  CLOSED = 'CLOSED',       // Normal operation
  OPEN = 'OPEN',           // Failing — reject all requests
  HALF_OPEN = 'HALF_OPEN', // Probing — allow one request through
}

interface CircuitData {
  state: CircuitState;
  failures: number;
  successes: number;      // counted in HALF_OPEN only
  openedAt: number | null; // epoch ms
}

@Injectable()
export class CircuitBreakerService implements OnModuleInit {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private redis!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.redis = new Redis({
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      password: this.config.get<string>('redis.password') || undefined,
      tls: this.config.get<boolean>('redis.tls') ? { rejectUnauthorized: false } : undefined,
      lazyConnect: true,
    });
  }

  private key(storeId: string): string {
    return `${REDIS_CB_PREFIX}${storeId}`;
  }

  async getState(storeId: string): Promise<CircuitData> {
    const raw = await this.redis.get(this.key(storeId));
    if (!raw) {
      return { state: CircuitState.CLOSED, failures: 0, successes: 0, openedAt: null };
    }
    return JSON.parse(raw) as CircuitData;
  }

  /**
   * Returns true if requests are allowed through for this store.
   * Automatically transitions OPEN → HALF_OPEN after the timeout.
   */
  async isAllowed(storeId: string): Promise<boolean> {
    const data = await this.getState(storeId);

    if (data.state === CircuitState.CLOSED) return true;

    if (data.state === CircuitState.OPEN) {
      const elapsed = (Date.now() - (data.openedAt ?? 0)) / 1000;
      if (elapsed >= CB_OPEN_TIMEOUT_SECONDS) {
        await this.transitionTo(storeId, data, CircuitState.HALF_OPEN);
        this.logger.log(`Circuit HALF_OPEN for store ${storeId}`);
        return true; // allow one probe request
      }
      return false;
    }

    // HALF_OPEN — allow through (processor counts successes/failures)
    return true;
  }

  async recordSuccess(storeId: string): Promise<void> {
    const data = await this.getState(storeId);

    if (data.state === CircuitState.HALF_OPEN) {
      data.successes += 1;
      if (data.successes >= CB_SUCCESS_THRESHOLD) {
        await this.transitionTo(storeId, data, CircuitState.CLOSED);
        this.logger.log(`Circuit CLOSED for store ${storeId} after recovery`);
        return;
      }
    } else if (data.state === CircuitState.CLOSED) {
      // Decay failures on success — prevents false opens after long-ago spikes
      if (data.failures > 0) {
        data.failures = Math.max(0, data.failures - 1);
        await this.save(storeId, data);
      }
    }

    await this.save(storeId, data);
  }

  async recordFailure(storeId: string): Promise<void> {
    const data = await this.getState(storeId);

    data.failures += 1;
    data.successes = 0;

    if (
      data.state !== CircuitState.OPEN &&
      data.failures >= CB_FAILURE_THRESHOLD
    ) {
      await this.transitionTo(storeId, data, CircuitState.OPEN);
      this.logger.warn(
        `Circuit OPEN for store ${storeId} — ${data.failures} failures in window`,
      );
      return;
    }

    await this.save(storeId, data);
  }

  async reset(storeId: string): Promise<void> {
    await this.redis.del(this.key(storeId));
    this.logger.log(`Circuit RESET for store ${storeId}`);
  }

  private async transitionTo(
    storeId: string,
    data: CircuitData,
    newState: CircuitState,
  ): Promise<void> {
    data.state = newState;
    data.successes = 0;
    if (newState === CircuitState.OPEN) {
      data.openedAt = Date.now();
    } else if (newState === CircuitState.CLOSED) {
      data.failures = 0;
      data.openedAt = null;
    }
    await this.save(storeId, data);
  }

  private async save(storeId: string, data: CircuitData): Promise<void> {
    await this.redis.setex(
      this.key(storeId),
      CB_WINDOW_SECONDS,
      JSON.stringify(data),
    );
  }
}
