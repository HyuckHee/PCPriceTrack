import { RamSpec, RamSpecSchema, RamTypeEnum } from '../../../../products/specs';
import { RawSpecData, SpecParseResult, SpecParser } from '../spec-parser.interface';
import { findByKeys, parseIntValue } from '../parse-utils';

export class NeweggRamParser implements SpecParser {
  readonly categorySlug = 'ram' as const;
  readonly storeName = 'Newegg';

  parse({ specTable = {}, productName = '' }: RawSpecData): SpecParseResult {
    const partial: Record<string, unknown> = {};
    const missing: string[] = [];

    // RAM type
    const typeRaw = findByKeys(specTable, ['type', 'memory type', 'memory standard']);
    let type: string | undefined;
    const src = typeRaw ?? productName;
    if (/ddr5/i.test(src)) type = 'DDR5';
    else if (/ddr4/i.test(src)) type = 'DDR4';
    else if (/ddr3/i.test(src)) type = 'DDR3';
    if (type && RamTypeEnum.options.includes(type as never)) partial.type = type;
    else missing.push('type');

    // Capacity
    const capRaw = findByKeys(specTable, ['capacity', 'total capacity', 'memory capacity']);
    const capacityGb = parseIntValue(capRaw);
    if (capacityGb) partial.capacityGb = capacityGb;
    else missing.push('capacityGb');

    // Modules
    const modRaw = findByKeys(specTable, ['number of modules', 'kit', 'modules']);
    let modules = parseIntValue(modRaw);
    // Fallback: product name often has "2 x 16GB" or "2x16GB"
    if (!modules) {
      const m = productName.match(/(\d+)\s*[x×]\s*\d+\s*(?:gb|g)/i);
      modules = m ? parseInt(m[1], 10) : 1;
    }
    partial.modules = modules;

    // Module capacity
    if (capacityGb && modules) {
      partial.moduleCapacityGb = Math.round(capacityGb / modules);
    } else missing.push('moduleCapacityGb');

    // Speed
    const speedRaw = findByKeys(specTable, ['speed', 'memory speed', 'memory clock']);
    // "DDR5-6000" → 6000, "6000 MHz" → 6000
    const speedStr = speedRaw ?? productName;
    const speedMatch = speedStr.match(/(?:ddr[345]-?|-)(\d{3,5})\b/i) ?? speedStr.match(/(\d{3,5})\s*mhz/i);
    const speedMhz = speedMatch ? parseInt(speedMatch[1], 10) : undefined;
    if (speedMhz) partial.speedMhz = speedMhz;
    else missing.push('speedMhz');

    // CAS latency
    const casRaw = findByKeys(specTable, ['cas latency', 'cl', 'timing']);
    partial.casLatency = parseIntValue(casRaw);

    // ECC
    const eccRaw = findByKeys(specTable, ['ecc', 'error correction']);
    if (eccRaw) partial.eccSupport = /yes|ecc/i.test(eccRaw);

    const result = RamSpecSchema.safeParse(partial);
    return { data: result.success ? result.data : undefined, partial, missing };
  }
}
