import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { CategorySlug, CategorySpecSchemaMap } from '../../../products/specs';
import { RawSpecData, SpecParseResult } from './spec-parser.interface';
import { Env } from '../../../../config/env';

const SYSTEM_PROMPT = `You are a PC component spec extractor. Given a product name, description, and raw spec table for a PC part, extract the structured specifications as a JSON object.

Rules:
- Only include fields you are confident about based on the provided data.
- Do not guess or infer values that are not present in the data.
- Output ONLY valid JSON. No explanation or markdown.
- Use the exact field names and value formats specified in the schema.
- For enum fields, use exactly one of the allowed values listed.`;

function buildUserPrompt(category: CategorySlug, raw: RawSpecData, schema: object): string {
  return `Category: ${category}

Product Name: ${raw.productName ?? 'N/A'}

Spec Table (key: value pairs):
${Object.entries(raw.specTable ?? {}).map(([k, v]) => `  ${k}: ${v}`).join('\n') || 'N/A'}

Description (first 500 chars):
${(raw.description ?? '').slice(0, 500) || 'N/A'}

Target JSON schema (extract values matching these fields):
${JSON.stringify(schema, null, 2)}

Return a JSON object with the extracted spec fields.`;
}

@Injectable()
export class LlmSpecExtractorService {
  private readonly logger = new Logger(LlmSpecExtractorService.name);
  private client: Anthropic | null = null;

  constructor(private readonly config: ConfigService<Env>) {
    const apiKey = this.config.get('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    } else {
      this.logger.warn('ANTHROPIC_API_KEY 미설정 — LLM 스펙 추출 비활성화');
    }
  }

  get isAvailable(): boolean {
    return this.client !== null;
  }

  async extract(category: CategorySlug, raw: RawSpecData): Promise<SpecParseResult> {
    const empty: SpecParseResult = { partial: {}, missing: [] };
    if (!this.client) return empty;

    const schema = CategorySpecSchemaMap[category];
    if (!schema) return empty;

    try {
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: buildUserPrompt(category, raw, (schema as { _def?: unknown })._def ?? {}),
          },
        ],
      });

      const text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn(`LLM 응답에 JSON 없음: category=${category}`);
        return empty;
      }

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      const result = (schema as { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: unknown } }).safeParse(parsed);

      return {
        data: result.success ? (result.data as never) : undefined,
        partial: parsed,
        missing: result.success ? [] : [],
      };
    } catch (err) {
      this.logger.error(`LLM 스펙 추출 실패: category=${category} error=${(err as Error).message}`);
      return empty;
    }
  }
}
