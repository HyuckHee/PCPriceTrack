import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { eq } from 'drizzle-orm';
import { DATABASE_TOKEN, Database } from '../../../database/database.provider';
import { crawlerSettings } from '../../../database/schema';
import { CrawlerService } from '../crawler.service';

export interface ScheduleConfig {
  key: string;
  label: string;
  cronExpr: string;
  description: string;
  updatedAt: Date | null;
}

/** 기본 크론 표현식 */
const DEFAULTS: Record<string, { label: string; cron: string; description: string }> = {
  'schedule.high_volatility': {
    label: 'GPU / CPU',
    cron: '0 0 */3 * * *',
    description: '고변동 카테고리 (GPU/CPU) 크롤링 주기',
  },
  'schedule.medium_volatility': {
    label: 'RAM / SSD',
    cron: '0 0 */8 * * *',
    description: '중변동 카테고리 (RAM/SSD) 크롤링 주기',
  },
  'schedule.nightly': {
    label: '야간 전체 동기화',
    cron: '0 0 2 * * *',
    description: '매일 새벽 2시 전체 카탈로그 동기화',
  },
};

@Injectable()
export class CrawlerScheduleService implements OnModuleInit {
  private readonly logger = new Logger(CrawlerScheduleService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly crawlerService: CrawlerService,
  ) {}

  async onModuleInit(): Promise<void> {
    // DB에서 설정 불러와서 크론 등록
    const saved = await this.db.select().from(crawlerSettings);
    const savedMap = new Map(saved.map(r => [r.key, r.value]));

    for (const [key, def] of Object.entries(DEFAULTS)) {
      const cron = savedMap.get(key) ?? def.cron;
      this.registerCronJob(key, cron);
    }
  }

  /** 현재 모든 스케줄 설정 반환 */
  async getSchedules(): Promise<ScheduleConfig[]> {
    const saved = await this.db.select().from(crawlerSettings);
    const savedMap = new Map(saved.map(r => [r.key, r]));

    return Object.entries(DEFAULTS).map(([key, def]) => {
      const record = savedMap.get(key);
      return {
        key,
        label: def.label,
        cronExpr: record?.value ?? def.cron,
        description: def.description,
        updatedAt: record?.updatedAt ?? null,
      };
    });
  }

  /** 스케줄 업데이트 — DB 저장 + 크론 재등록 */
  async updateSchedule(key: string, cronExpr: string): Promise<ScheduleConfig> {
    if (!DEFAULTS[key]) {
      throw new Error(`알 수 없는 스케줄 키: ${key}`);
    }

    this.validateCron(cronExpr);

    // DB upsert
    await this.db
      .insert(crawlerSettings)
      .values({ key, value: cronExpr, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: crawlerSettings.key,
        set: { value: cronExpr, updatedAt: new Date() },
      });

    // 크론 재등록
    this.registerCronJob(key, cronExpr);

    this.logger.log(`스케줄 업데이트: ${key} → "${cronExpr}"`);

    return {
      key,
      label: DEFAULTS[key].label,
      cronExpr,
      description: DEFAULTS[key].description,
      updatedAt: new Date(),
    };
  }

  /** 스케줄 기본값으로 리셋 */
  async resetSchedule(key: string): Promise<ScheduleConfig> {
    if (!DEFAULTS[key]) throw new Error(`알 수 없는 스케줄 키: ${key}`);

    await this.db.delete(crawlerSettings).where(eq(crawlerSettings.key, key));

    const def = DEFAULTS[key];
    this.registerCronJob(key, def.cron);

    this.logger.log(`스케줄 리셋: ${key} → "${def.cron}"`);

    return {
      key,
      label: def.label,
      cronExpr: def.cron,
      description: def.description,
      updatedAt: null,
    };
  }

  // ─── 내부 헬퍼 ──────────────────────────────────────────────────────────

  private registerCronJob(key: string, cronExpr: string): void {
    // 기존 크론 있으면 제거
    try {
      const existing = this.schedulerRegistry.getCronJob(key);
      existing.stop();
      this.schedulerRegistry.deleteCronJob(key);
    } catch {
      // 없으면 무시
    }

    const job = new CronJob(cronExpr, async () => {
      this.logger.log(`크론 실행: ${key}`);
      try {
        await this.crawlerService.enqueueAllStores({ triggeredBy: 'cron', note: key });
      } catch (err) {
        this.logger.error(`크론 실행 오류 [${key}]: ${(err as Error).message}`);
      }
    });

    this.schedulerRegistry.addCronJob(key, job);
    job.start();

    this.logger.log(`크론 등록: ${key} → "${cronExpr}"`);
  }

  private validateCron(expr: string): void {
    try {
      // CronJob 생성으로 유효성 검사 (잘못된 표현식이면 throw)
      new CronJob(expr, () => {});
    } catch {
      throw new Error(`유효하지 않은 cron 표현식: "${expr}"`);
    }
  }
}
