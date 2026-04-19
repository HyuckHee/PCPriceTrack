import { PsuEfficiencyEnum, PsuFormFactorEnum, PsuModularityEnum, PsuSpec, PsuSpecSchema } from '../../../../products/specs';
import { RawSpecData, SpecParseResult, SpecParser } from '../spec-parser.interface';
import { findByKeys, parseIntValue, parseMm } from '../parse-utils';

function normalizeFormFactor(raw: string): string | undefined {
  const s = raw.toLowerCase();
  if (s.includes('sfx-l') || s.includes('sfx l')) return 'SFX-L';
  if (s.includes('sfx')) return 'SFX';
  if (s.includes('tfx')) return 'TFX';
  if (s.includes('flex')) return 'FlexATX';
  if (s.includes('atx')) return 'ATX';
  return undefined;
}

function normalizeEfficiency(raw: string): string | undefined {
  const s = raw.toLowerCase();
  if (s.includes('titanium')) return 'TITANIUM';
  if (s.includes('platinum')) return 'PLATINUM';
  if (s.includes('gold')) return 'GOLD';
  if (s.includes('silver')) return 'SILVER';
  if (s.includes('bronze')) return 'BRONZE';
  if (s.includes('80 plus') || s.includes('80+')) return 'STANDARD';
  return undefined;
}

function normalizeModularity(raw: string): string | undefined {
  const s = raw.toLowerCase();
  if (s.includes('full')) return 'FULL_MODULAR';
  if (s.includes('semi') || s.includes('partial')) return 'SEMI_MODULAR';
  if (s.includes('non') || s.includes('fixed')) return 'NON_MODULAR';
  return undefined;
}

export class NeweggPsuParser implements SpecParser {
  readonly categorySlug = 'psu' as const;
  readonly storeName = 'Newegg';

  parse({ specTable = {}, productName = '' }: RawSpecData): SpecParseResult {
    const partial: Record<string, unknown> = {};
    const missing: string[] = [];

    // Wattage
    const wattRaw = findByKeys(specTable, ['wattage', 'max output', 'continuous power', 'power output']);
    const wattage = parseIntValue(wattRaw ?? productName);
    if (wattage) partial.wattage = wattage;
    else missing.push('wattage');

    // Form factor
    const ffRaw = findByKeys(specTable, ['form factor', 'type', 'psu form factor']);
    const formFactor = ffRaw ? normalizeFormFactor(ffRaw) : normalizeFormFactor(productName);
    if (formFactor && PsuFormFactorEnum.options.includes(formFactor as never)) {
      partial.formFactor = formFactor;
    } else {
      partial.formFactor = 'ATX'; // safe default
    }

    // Efficiency
    const effRaw = findByKeys(specTable, ['efficiency', '80 plus', '80plus', 'certification']);
    const efficiency = effRaw ? normalizeEfficiency(effRaw) : normalizeEfficiency(productName);
    if (efficiency && PsuEfficiencyEnum.options.includes(efficiency as never)) {
      partial.efficiency = efficiency;
    }

    // Modularity
    const modRaw = findByKeys(specTable, ['modular', 'modularity', 'cable management']);
    const modularity = modRaw ? normalizeModularity(modRaw) : undefined;
    if (modularity && PsuModularityEnum.options.includes(modularity as never)) {
      partial.modularity = modularity;
    }

    // Length
    const lenRaw = findByKeys(specTable, ['length', 'depth', 'dimensions']);
    partial.lengthMm = parseMm(lenRaw);

    const result = PsuSpecSchema.safeParse(partial);
    return { data: result.success ? result.data : undefined, partial, missing };
  }
}
