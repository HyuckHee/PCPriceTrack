import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_TOKEN, Database } from '../../../database/database.provider';
import { products } from '../../../database/schema';
import { CategorySlug } from '../../products/specs';
import { RawSpecData } from './spec-parsers/spec-parser.interface';
import { getParser } from './spec-parsers/parser-registry';
import { LlmSpecExtractorService } from './spec-parsers/llm-spec-extractor.service';

export interface ExtractionInput {
  productId: string;
  storeName: string;
  categorySlug: string;
  raw: RawSpecData;
}

@Injectable()
export class SpecExtractionService {
  private readonly logger = new Logger(SpecExtractionService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly llmExtractor: LlmSpecExtractorService,
  ) {}

  async extractAndSave(input: ExtractionInput): Promise<void> {
    const { productId, storeName, categorySlug, raw } = input;

    const slug = categorySlug as CategorySlug;

    // Step 1: rule-based parser
    const parser = getParser(storeName, slug);
    let result = parser?.parse(raw);
    let status: 'parsed' | 'llm' | 'failed' = 'failed';

    if (result?.data) {
      status = 'parsed';
      this.logger.debug(`[Spec] 파싱 성공 (rule): product=${productId} category=${slug}`);
    } else if (result?.partial && Object.keys(result.partial).length > 0) {
      // Step 2: partial parse — try LLM on missing fields
      if (this.llmExtractor.isAvailable) {
        const llmResult = await this.llmExtractor.extract(slug, raw);
        if (llmResult.data) {
          result = llmResult;
          status = 'llm';
          this.logger.debug(`[Spec] 파싱 성공 (llm): product=${productId} category=${slug}`);
        }
      }
    } else if (!result && this.llmExtractor.isAvailable) {
      // Step 3: no parser for this store — full LLM extraction
      const llmResult = await this.llmExtractor.extract(slug, raw);
      if (llmResult.data) {
        result = llmResult;
        status = 'llm';
        this.logger.debug(`[Spec] 파싱 성공 (llm-only): product=${productId} category=${slug}`);
      }
    }

    const specs = result?.data ?? result?.partial ?? {};
    const hasSpecs = Object.keys(specs).length > 0;

    await this.db
      .update(products)
      .set({
        specs: hasSpecs ? (specs as Record<string, unknown>) : {},
        specExtractionStatus: status,
        specUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    if (status === 'failed') {
      this.logger.warn(
        `[Spec] 추출 실패: product=${productId} category=${slug} missing=${result?.missing?.join(',') ?? 'all'}`,
      );
    }
  }
}
