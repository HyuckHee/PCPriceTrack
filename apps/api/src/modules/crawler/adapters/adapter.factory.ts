import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { DATABASE_TOKEN, Database } from '../../../database/database.provider';
import { stores } from '../../../database/schema';
import { ISiteAdapter } from '../interfaces/adapter.interface';
import { NeweggAdapter } from './newegg.adapter';
import { AmazonAdapter } from './amazon.adapter';
import { CoupangAdapter } from './coupang.adapter';
import { ElevenStAdapter } from './elevenst.adapter';
import { GmarketAdapter } from './gmarket.adapter';
import { NaverShoppingApiAdapter } from './naver-shopping.adapter';
import { AdapterConfig } from './base.adapter';

@Injectable()
export class AdapterFactory implements OnModuleInit {
  private readonly logger = new Logger(AdapterFactory.name);
  private readonly adapterMap = new Map<string, ISiteAdapter>();

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadAdapters();
  }

  /**
   * Loads active stores from DB and instantiates the correct adapter.
   * Called on startup and can be called again to refresh after adding a store.
   */
  async loadAdapters(): Promise<void> {
    const activeStores = await this.db
      .select()
      .from(stores)
      .where(eq(stores.isActive, true));

    for (const store of activeStores) {
      const adapter = this.createAdapter(store.id, store.name);
      if (adapter) {
        this.adapterMap.set(store.id, adapter);
        this.logger.log(`Loaded adapter for "${store.name}" (${store.id})`);
      } else {
        this.logger.warn(`No adapter implemented for store "${store.name}" — skipping`);
      }
    }
  }

  getAdapter(storeId: string): ISiteAdapter {
    const adapter = this.adapterMap.get(storeId);
    if (!adapter) {
      throw new NotFoundException(`No adapter found for storeId: ${storeId}`);
    }
    return adapter;
  }

  getAllAdapters(): ISiteAdapter[] {
    return Array.from(this.adapterMap.values());
  }

  private createAdapter(storeId: string, storeName: string): ISiteAdapter | null {
    const baseConfig: AdapterConfig = {
      storeId,
      storeName,
      concurrency: this.config.get<number>('crawler.concurrency') ?? 2,
      requestDelay: 2000,
      maxRetries: 3,
      proxyUrl: this.config.get<string>('crawler.proxyUrl'),
    };

    const n = storeName.toLowerCase();

    if (n.includes('newegg')) return new NeweggAdapter(baseConfig);
    if (n.includes('amazon')) return new AmazonAdapter(baseConfig);
    if (n.includes('coupang') || n.includes('쿠팡')) return new CoupangAdapter(baseConfig);
    if (n.includes('11번가') || n.includes('11st') || n.includes('elevenst')) return new ElevenStAdapter(baseConfig);
    if (n.includes('gmarket') || n.includes('g마켓')) return new GmarketAdapter(baseConfig);
    if (n.includes('naver') || n.includes('네이버')) {
      const clientId = this.config.get<string>('NAVER_CLIENT_ID');
      const clientSecret = this.config.get<string>('NAVER_CLIENT_SECRET');
      if (!clientId || !clientSecret) {
        this.logger.warn(`네이버쇼핑 API 키 미설정 (NAVER_CLIENT_ID / NAVER_CLIENT_SECRET) — 어댑터 건너뜀`);
        return null;
      }
      return new NaverShoppingApiAdapter({ storeId, storeName, clientId, clientSecret });
    }

    return null;
  }
}
