import { CategorySlug } from '../../../products/specs';
import { SpecParser } from './spec-parser.interface';
import {
  NeweggCpuParser,
  NeweggGpuParser,
  NeweggRamParser,
  NeweggMotherboardParser,
  NeweggPsuParser,
  NeweggCaseParser,
  NeweggCoolerParser,
  NeweggStorageParser,
} from './newegg';

type ParserKey = `${string}:${CategorySlug}`;

const REGISTRY = new Map<ParserKey, SpecParser>();

function register(parser: SpecParser) {
  REGISTRY.set(`${parser.storeName}:${parser.categorySlug}`, parser);
}

// Newegg parsers
register(new NeweggCpuParser());
register(new NeweggMotherboardParser());
register(new NeweggRamParser());
register(new NeweggGpuParser());
register(new NeweggPsuParser());
register(new NeweggCaseParser());
register(new NeweggCoolerParser());
register(new NeweggStorageParser('ssd'));
register(new NeweggStorageParser('hdd'));

export function getParser(storeName: string, categorySlug: string): SpecParser | undefined {
  // Exact match first
  const exact = REGISTRY.get(`${storeName}:${categorySlug}` as ParserKey);
  if (exact) return exact;

  // Fallback: Newegg parser for Korean stores that use similar spec table format
  return REGISTRY.get(`Newegg:${categorySlug}` as ParserKey);
}
