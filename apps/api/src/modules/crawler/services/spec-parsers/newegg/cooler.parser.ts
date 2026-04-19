import {
  CoolerSpecSchema,
  CoolerTypeEnum,
  CpuSocketEnum,
  RadiatorSizeEnum,
} from '../../../../products/specs';
import { RawSpecData, SpecParseResult, SpecParser } from '../spec-parser.interface';
import { findByKeys, parseIntValue, parseMm } from '../parse-utils';

const ALL_SOCKETS = CpuSocketEnum.options;

function parseSockets(raw: string): Array<typeof CpuSocketEnum._type> {
  return ALL_SOCKETS.filter((s) =>
    raw.toUpperCase().includes(s.toUpperCase()),
  );
}

function parseRadiatorSize(raw: string): typeof RadiatorSizeEnum._type | undefined {
  const candidates: Array<typeof RadiatorSizeEnum._type> = ['420', '360', '280', '240', '140', '120'];
  return candidates.find((s) => raw.includes(s));
}

export class NeweggCoolerParser implements SpecParser {
  readonly categorySlug = 'cooler' as const;
  readonly storeName = 'Newegg';

  parse({ specTable = {}, productName = '' }: RawSpecData): SpecParseResult {
    const partial: Record<string, unknown> = {};
    const missing: string[] = [];

    // Cooler type
    const typeRaw = findByKeys(specTable, ['type', 'cooler type', 'cpu cooler type']);
    const nameAndType = `${typeRaw ?? ''} ${productName}`.toLowerCase();
    let coolerType: string;
    if (/aio|liquid|water|all.in.one/i.test(nameAndType)) coolerType = 'AIO';
    else if (/custom|hardline/i.test(nameAndType)) coolerType = 'CUSTOM_LOOP';
    else coolerType = 'AIR';
    partial.coolerType = coolerType;

    // Supported sockets
    const sockRaw = findByKeys(specTable, ['socket support', 'compatible socket', 'cpu socket', 'socket compatibility']);
    const allText = `${sockRaw ?? ''} ${productName}`;
    const supportedSockets = parseSockets(allText);
    if (supportedSockets.length > 0) partial.supportedSockets = supportedSockets;
    else missing.push('supportedSockets');

    // TDP rating
    const tdpRaw = findByKeys(specTable, ['tdp', 'max tdp', 'rated tdp']);
    partial.tdpRating = parseIntValue(tdpRaw);

    // Air cooler height
    if (coolerType === 'AIR') {
      const heightRaw = findByKeys(specTable, ['height', 'cooler height', 'dimensions']);
      partial.heightMm = parseMm(heightRaw);
      if (!partial.heightMm) missing.push('heightMm');
    }

    // AIO radiator
    if (coolerType === 'AIO') {
      const radRaw = findByKeys(specTable, ['radiator size', 'radiator', 'liquid cooler size']);
      const allSrc = `${radRaw ?? ''} ${productName}`;
      partial.radiatorSize = parseRadiatorSize(allSrc);
      if (!partial.radiatorSize) missing.push('radiatorSize');
    }

    // Fan count
    const fanRaw = findByKeys(specTable, ['fan included', 'number of fans', 'fan quantity']);
    partial.fanCount = parseIntValue(fanRaw);

    const result = CoolerSpecSchema.safeParse(partial);
    return { data: result.success ? result.data : undefined, partial, missing };
  }
}
