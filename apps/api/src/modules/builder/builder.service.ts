import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, asc, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';
import { DATABASE_TOKEN, Database } from '../../database/database.provider';
import { categories, productListings, priceRecords, products, stores } from '../../database/schema';
import { CategorySpecSchemaMap, CategorySlug } from '../products/specs';
import { BUILD_PRESETS, UsageType } from './build-presets';
import { checkCompatibility, checkBottleneck, CompatibilityIssue } from './compatibility/rules';
import { EstimateRequestDto, EstimateResponseDto, SelectedPart } from './dto/estimate.dto';

const CATEGORY_ORDER: CategorySlug[] = [
  'cpu', 'gpu', 'motherboard', 'ram', 'case', 'cooler', 'psu', 'ssd',
];

const CATEGORY_LABELS: Record<string, string> = {
  cpu: 'CPU',
  gpu: '그래픽카드',
  motherboard: '메인보드',
  ram: '메모리',
  case: '케이스',
  cooler: '쿨러',
  psu: '파워',
  ssd: 'SSD',
};

interface CandidateProduct {
  id: string;
  name: string;
  slug: string;
  brand: string;
  imageUrl: string | null;
  specs: Record<string, unknown>;
  performanceScore: number | null;
  singleThreadScore: number | null;
  price: number;
  currency: string;
  storeUrl: string | null;
  storeName: string | null;
  inStock: boolean;
  valueScore: number;
}

@Injectable()
export class BuilderService {
  private readonly logger = new Logger(BuilderService.name);

  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async estimate(req: EstimateRequestDto): Promise<EstimateResponseDto> {
    const preset = BUILD_PRESETS[req.usage];
    const warnings: CompatibilityIssue[] = [];
    const selected: Record<string, SelectedPart> = {};
    let remainingBudget = req.budget;

    for (const slug of CATEGORY_ORDER) {
      const allocation = preset.budgetAllocation[slug];
      if (!allocation) continue;

      const [minPct, maxPct] = allocation;
      // RAM은 2개 구성이 기본이므로 단가 기준으로 탐색
      const qty = slug === 'ram' ? 2 : 1;
      const minBudget = Math.floor(req.budget * minPct / qty);
      const maxBudget = Math.floor(req.budget * maxPct / qty);

      // Office: skip GPU unless budget > 500k
      if (slug === 'gpu' && req.usage === 'office' && req.budget < 500000) continue;

      const candidates = await this.fetchCandidates(
        slug,
        minBudget,
        maxBudget,
        req,
        selected,
        preset.cpuMinScore,
        preset.gpuMinScore,
      );

      if (candidates.length === 0) {
        this.logger.warn(`[Builder] 후보 없음: category=${slug} budget=${minBudget}~${maxBudget}`);
        continue;
      }

      // Pick best value_score candidate
      const pick = candidates[0];
      const part: SelectedPart = {
        category: slug,
        categoryName: CATEGORY_LABELS[slug] ?? slug,
        productId: pick.id,
        productName: pick.name,
        slug: pick.slug,
        brand: pick.brand,
        price: pick.price * qty,
        currency: pick.currency,
        imageUrl: pick.imageUrl,
        storeUrl: pick.storeUrl,
        storeName: pick.storeName,
        inStock: pick.inStock,
        specs: pick.specs,
        performanceScore: pick.performanceScore,
        ...(qty > 1 ? { quantity: qty } : {}),
      };
      selected[slug] = part;
      remainingBudget -= pick.price * qty;
    }

    // ── Compatibility check ─────────────────────────────────────────────────
    const parseSpec = <T>(slug: string) => {
      const part = selected[slug];
      if (!part?.specs || Object.keys(part.specs).length === 0) return undefined;
      const schema = CategorySpecSchemaMap[slug as CategorySlug];
      const r = (schema as { safeParse: (v: unknown) => { success: boolean; data?: T } }).safeParse(part.specs);
      return r.success ? r.data : undefined;
    };

    const compatIssues = checkCompatibility({
      cpu: parseSpec('cpu'),
      motherboard: parseSpec('motherboard'),
      ram: parseSpec('ram'),
      gpu: parseSpec('gpu'),
      psu: parseSpec('psu'),
      case: parseSpec('case'),
      cooler: parseSpec('cooler'),
      cpuTdp: (parseSpec<{ tdp?: number }>('cpu') as { tdp?: number } | undefined)?.tdp,
      gpuTdp: (parseSpec<{ tdp?: number }>('gpu') as { tdp?: number } | undefined)?.tdp,
    });
    warnings.push(...compatIssues);

    // ── Bottleneck check ────────────────────────────────────────────────────
    const cpuScore = selected['cpu']?.performanceScore ?? null;
    const gpuScore = selected['gpu']?.performanceScore ?? null;
    const bottleneck = checkBottleneck(cpuScore, gpuScore, preset.ratioRange);
    if (bottleneck) warnings.push(bottleneck);

    const totalPrice = Object.values(selected).reduce((s, p) => s + p.price, 0);
    const ratio = cpuScore && gpuScore ? gpuScore / cpuScore : null;

    return {
      budget: req.budget,
      components: Object.values(selected),
      totalPrice,
      budgetUsed: Math.round((totalPrice / req.budget) * 100),
      currency: Object.values(selected)[0]?.currency ?? 'KRW',
      warnings,
      performanceSummary: {
        cpuScore,
        gpuScore,
        balanceRatio: ratio ? Math.round(ratio * 100) / 100 : null,
        label: preset.label,
      },
    };
  }

  private async fetchCandidates(
    slug: CategorySlug,
    minBudget: number,
    maxBudget: number,
    req: EstimateRequestDto,
    selected: Record<string, SelectedPart>,
    cpuMinScore: number,
    gpuMinScore: number,
  ): Promise<CandidateProduct[]> {
    // Cheapest active listing per product (with store info)
    const latestPrice = this.db
      .select({
        productId: productListings.productId,
        listingId: productListings.id,
        storeUrl: productListings.url,
        storeId: productListings.storeId,
        price: sql<number>`MIN(CAST(${priceRecords.price} AS numeric))`.as('price'),
        currency: priceRecords.currency,
        inStock: priceRecords.inStock,
      })
      .from(priceRecords)
      .innerJoin(productListings, eq(priceRecords.listingId, productListings.id))
      .where(eq(productListings.isActive, true))
      .groupBy(
        productListings.productId,
        productListings.id,
        productListings.url,
        productListings.storeId,
        priceRecords.currency,
        priceRecords.inStock,
      )
      .as('latest_price');

    const conditions = [
      eq(categories.slug, slug),
      gte(latestPrice.price, minBudget),
      lte(latestPrice.price, maxBudget),
    ];

    // Score filters
    if (slug === 'cpu' && cpuMinScore > 0) {
      conditions.push(gte(products.performanceScore, cpuMinScore));
    }
    if (slug === 'gpu' && gpuMinScore > 0) {
      conditions.push(gte(products.performanceScore, gpuMinScore));
    }

    // Brand filters
    if (slug === 'cpu' && req.preferredCpuBrand) {
      conditions.push(
        sql`LOWER(${products.brand}) LIKE ${`%${req.preferredCpuBrand}%`}`,
      );
    }
    if (slug === 'gpu' && req.preferredGpuBrand) {
      conditions.push(
        sql`LOWER(${products.brand}) LIKE ${`%${req.preferredGpuBrand}%`}`,
      );
    }

    const rows = await this.db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        brand: products.brand,
        imageUrl: products.imageUrl,
        specs: products.specs,
        performanceScore: products.performanceScore,
        singleThreadScore: products.singleThreadScore,
        price: latestPrice.price,
        currency: latestPrice.currency,
        storeUrl: latestPrice.storeUrl,
        storeName: stores.name,
        inStock: latestPrice.inStock,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(latestPrice, eq(products.id, latestPrice.productId))
      .innerJoin(stores, eq(latestPrice.storeId, stores.id))
      .where(and(...conditions))
      .limit(20);

    return rows
      .map((r) => ({
        ...r,
        specs: (r.specs ?? {}) as Record<string, unknown>,
        price: Number(r.price),
        valueScore: r.performanceScore ? r.performanceScore / Number(r.price) : 0,
      }))
      .sort((a, b) => b.valueScore - a.valueScore);
  }
}
