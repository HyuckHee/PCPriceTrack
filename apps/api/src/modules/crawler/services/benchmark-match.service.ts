import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_TOKEN, Database } from '../../../database/database.provider';
import { benchmarkScores, products } from '../../../database/schema';
import {
  CPU_BENCHMARKS,
  GPU_BENCHMARKS,
  CpuBenchmark,
  GpuBenchmark,
} from './benchmark-reference.data';

function normalizeModelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/intel\s+/gi, '')
    .replace(/amd\s+/gi, '')
    .replace(/nvidia\s+/gi, '')
    .replace(/geforce\s+/gi, '')
    .replace(/radeon\s+/gi, '')
    .replace(/core\s+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreMatch(productName: string, refModel: string): number {
  const pNorm = normalizeModelName(productName);
  const rNorm = normalizeModelName(refModel);
  if (pNorm.includes(rNorm)) return 1.0;
  // token overlap
  const pTokens = new Set(pNorm.split(' '));
  const rTokens = rNorm.split(' ');
  const matched = rTokens.filter((t) => pTokens.has(t)).length;
  return matched / rTokens.length;
}

@Injectable()
export class BenchmarkMatchService {
  private readonly logger = new Logger(BenchmarkMatchService.name);

  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async matchAndSave(productId: string, productName: string, categorySlug: string): Promise<void> {
    if (categorySlug === 'cpu') {
      await this.matchCpu(productId, productName);
    } else if (categorySlug === 'gpu') {
      await this.matchGpu(productId, productName);
    }
  }

  private async matchCpu(productId: string, productName: string): Promise<void> {
    const best = this.findBest(productName, CPU_BENCHMARKS);
    if (!best || best.score < 0.6) return;

    const ref = best.ref as CpuBenchmark;
    this.logger.debug(`[Benchmark] CPU 매칭: "${productName}" → "${ref.model}" (score=${best.score.toFixed(2)})`);

    await this.db
      .update(products)
      .set({ performanceScore: ref.cpuMark, singleThreadScore: ref.singleThread })
      .where(eq(products.id, productId));

    await this.upsertScore(productId, 'passmark', 'cpu_mark', ref.cpuMark, ref.model);
    await this.upsertScore(productId, 'passmark', 'cpu_single_thread', ref.singleThread, ref.model);
  }

  private async matchGpu(productId: string, productName: string): Promise<void> {
    const best = this.findBest(productName, GPU_BENCHMARKS);
    if (!best || best.score < 0.6) return;

    const ref = best.ref as GpuBenchmark;
    this.logger.debug(`[Benchmark] GPU 매칭: "${productName}" → "${ref.model}" (score=${best.score.toFixed(2)})`);

    await this.db
      .update(products)
      .set({ performanceScore: ref.g3dMark })
      .where(eq(products.id, productId));

    await this.upsertScore(productId, 'passmark', 'g3d_mark', ref.g3dMark, ref.model);
  }

  private findBest(
    productName: string,
    refs: Array<CpuBenchmark | GpuBenchmark>,
  ): { ref: CpuBenchmark | GpuBenchmark; score: number } | null {
    let best: { ref: CpuBenchmark | GpuBenchmark; score: number } | null = null;
    for (const ref of refs) {
      const score = scoreMatch(productName, ref.model);
      if (!best || score > best.score) best = { ref, score };
    }
    return best;
  }

  private async upsertScore(
    productId: string,
    source: 'passmark',
    scoreType: 'cpu_mark' | 'cpu_single_thread' | 'g3d_mark',
    score: number,
    sourceProductName: string,
  ): Promise<void> {
    await this.db
      .insert(benchmarkScores)
      .values({ productId, source, scoreType, score, sourceProductName })
      .onConflictDoUpdate({
        target: [benchmarkScores.productId, benchmarkScores.source, benchmarkScores.scoreType],
        set: { score, fetchedAt: new Date() },
      });
  }
}
