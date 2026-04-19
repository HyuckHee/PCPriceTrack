import { GpuSpec, GpuSpecSchema, PowerConnectorEnum } from '../../../../products/specs';
import { RawSpecData, SpecParseResult, SpecParser } from '../spec-parser.interface';
import { findByKeys, parseIntValue, parseMm } from '../parse-utils';

function parsePowerConnectors(raw: string): Array<typeof PowerConnectorEnum._type> {
  const connectors: Array<typeof PowerConnectorEnum._type> = [];
  if (/12v-2x6|12v2x6/i.test(raw)) connectors.push('12V2x6');
  else if (/12vhpwr/i.test(raw)) connectors.push('12VHPWR');
  else if (/3\s*[x×]\s*8/i.test(raw)) connectors.push('3x8PIN');
  else if (/2\s*[x×]\s*8/i.test(raw)) connectors.push('2x8PIN');
  else if (/6\s*[+]\s*2/i.test(raw)) connectors.push('6+2PIN');
  else if (/\b8.?pin/i.test(raw)) connectors.push('8PIN');
  else if (/\b6.?pin/i.test(raw)) connectors.push('6PIN');
  if (connectors.length === 0) connectors.push('NONE');
  return connectors;
}

export class NeweggGpuParser implements SpecParser {
  readonly categorySlug = 'gpu' as const;
  readonly storeName = 'Newegg';

  parse({ specTable = {}, productName = '' }: RawSpecData): SpecParseResult {
    const partial: Record<string, unknown> = {};
    const missing: string[] = [];

    // Length
    const lenRaw = findByKeys(specTable, ['card length', 'maximum gpu length', 'length', 'card dimension']);
    const lengthMm = parseMm(lenRaw);
    if (lengthMm) partial.lengthMm = lengthMm;
    else missing.push('lengthMm');

    // Slot width
    const slotRaw = findByKeys(specTable, ['slot width', 'slots required', 'card width']);
    const widthSlots = slotRaw ? parseFloat(slotRaw.replace(/[^0-9.]/g, '')) || undefined : undefined;
    if (widthSlots) partial.widthSlots = widthSlots;
    else { partial.widthSlots = 2; } // safe default

    // TDP / Power
    const tdpRaw = findByKeys(specTable, ['thermal design power', 'tdp', 'maximum power consumption', 'max power']);
    const tdp = parseIntValue(tdpRaw);
    if (tdp) partial.tdp = tdp;
    else missing.push('tdp');

    // VRAM
    const vramRaw = findByKeys(specTable, ['memory size', 'video memory', 'vram', 'graphics ram size']);
    const vramGb = parseIntValue(vramRaw);
    if (vramGb) partial.vramGb = vramGb;
    else missing.push('vramGb');

    // Power connectors
    const connRaw = findByKeys(specTable, ['power connector', 'pcie power connector', 'auxiliary power connector']);
    partial.powerConnectors = parsePowerConnectors(connRaw ?? '');

    // Recommended PSU
    const psuRaw = findByKeys(specTable, ['recommended psu', 'minimum system power', 'recommended system power']);
    partial.recommendedPsuWattage = parseIntValue(psuRaw);

    // Chipset (GPU model)
    const chipsetRaw = findByKeys(specTable, ['gpu', 'chipset', 'graphics processor', 'gpu model']);
    if (chipsetRaw) partial.chipset = chipsetRaw;

    const result = GpuSpecSchema.safeParse(partial);
    return { data: result.success ? result.data : undefined, partial, missing };
  }
}
