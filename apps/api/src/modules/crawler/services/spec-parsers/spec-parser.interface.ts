import { AnySpec, CategorySlug } from '../../../products/specs';

export interface RawSpecData {
  /** Product page spec table: { 'Socket Type': 'LGA 1700', 'TDP': '125W', ... } */
  specTable?: Record<string, string>;
  /** Product name from listing */
  productName?: string;
  /** Full description text */
  description?: string;
}

export interface SpecParseResult {
  /** Fully validated spec — present only when all required fields parsed */
  data?: AnySpec;
  /** Fields that were extracted but may be incomplete */
  partial: Record<string, unknown>;
  /** Which fields failed to parse */
  missing: string[];
}

export interface SpecParser {
  readonly categorySlug: CategorySlug;
  readonly storeName: string;

  parse(raw: RawSpecData): SpecParseResult;
}
