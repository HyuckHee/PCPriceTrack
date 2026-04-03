import { Injectable, Logger } from '@nestjs/common';
import {
  CB_FAILURE_THRESHOLD,
  CB_OPEN_TIMEOUT_SECONDS,
  CB_SUCCESS_THRESHOLD,
  CB_WINDOW_SECONDS,
} from '../constants';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitData {
  state: CircuitState;
  failures: number;
  successes: number;
  openedAt: number | null;
  windowStart: number; // 실패 카운트 윈도우 시작 시각
}

/**
 * 인메모리 Circuit Breaker (Redis 불필요 — 단일 서버 환경).
 * Redis 대비 명령 수 0, 서버 재시작 시 상태 초기화됨.
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly store = new Map<string, CircuitData>();

  private get(storeId: string): CircuitData {
    if (!this.store.has(storeId)) {
      this.store.set(storeId, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        openedAt: null,
        windowStart: Date.now(),
      });
    }
    return this.store.get(storeId)!;
  }

  async getState(storeId: string): Promise<CircuitData> {
    return this.get(storeId);
  }

  async isAllowed(storeId: string): Promise<boolean> {
    const data = this.get(storeId);

    // 윈도우 만료 시 실패 카운트 리셋
    if (Date.now() - data.windowStart > CB_WINDOW_SECONDS * 1000) {
      data.failures = 0;
      data.windowStart = Date.now();
    }

    if (data.state === CircuitState.CLOSED) return true;

    if (data.state === CircuitState.OPEN) {
      const elapsed = (Date.now() - (data.openedAt ?? 0)) / 1000;
      if (elapsed >= CB_OPEN_TIMEOUT_SECONDS) {
        this.transition(storeId, data, CircuitState.HALF_OPEN);
        this.logger.log(`Circuit HALF_OPEN for store ${storeId}`);
        return true;
      }
      return false;
    }

    return true; // HALF_OPEN
  }

  async recordSuccess(storeId: string): Promise<void> {
    const data = this.get(storeId);

    if (data.state === CircuitState.HALF_OPEN) {
      data.successes += 1;
      if (data.successes >= CB_SUCCESS_THRESHOLD) {
        this.transition(storeId, data, CircuitState.CLOSED);
        this.logger.log(`Circuit CLOSED for store ${storeId} after recovery`);
      }
    } else if (data.state === CircuitState.CLOSED && data.failures > 0) {
      data.failures = Math.max(0, data.failures - 1);
    }
  }

  async recordFailure(storeId: string): Promise<void> {
    const data = this.get(storeId);

    data.failures += 1;
    data.successes = 0;

    if (data.state !== CircuitState.OPEN && data.failures >= CB_FAILURE_THRESHOLD) {
      this.transition(storeId, data, CircuitState.OPEN);
      this.logger.warn(`Circuit OPEN for store ${storeId} — ${data.failures} failures in window`);
    }
  }

  async reset(storeId: string): Promise<void> {
    this.store.delete(storeId);
    this.logger.log(`Circuit RESET for store ${storeId}`);
  }

  private transition(storeId: string, data: CircuitData, newState: CircuitState): void {
    data.state = newState;
    data.successes = 0;
    if (newState === CircuitState.OPEN) {
      data.openedAt = Date.now();
    } else if (newState === CircuitState.CLOSED) {
      data.failures = 0;
      data.openedAt = null;
      data.windowStart = Date.now();
    }
    this.store.set(storeId, data);
  }
}
