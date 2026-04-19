import { CpuSocketEnum, CpuSpec, CpuSpecSchema, RamTypeEnum } from '../../../../products/specs';
import { RawSpecData, SpecParseResult, SpecParser } from '../spec-parser.interface';
import { findByKeys, parseFloatValue, parseIntValue } from '../parse-utils';

const SOCKET_ALIASES: Record<string, string> = {
  'lga1700': 'LGA1700',
  'lga 1700': 'LGA1700',
  'lga1851': 'LGA1851',
  'lga 1851': 'LGA1851',
  'lga1200': 'LGA1200',
  'lga 1200': 'LGA1200',
  'lga2066': 'LGA2066',
  'lga 2066': 'LGA2066',
  'am4': 'AM4',
  'am5': 'AM5',
  'strx4': 'sTRX4',
  'str5': 'sTR5',
  'str4': 'sTRX4',
};

function normalizeSocket(raw: string): string | undefined {
  const key = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const [alias, value] of Object.entries(SOCKET_ALIASES)) {
    if (key.includes(alias)) return value;
  }
  return undefined;
}

function detectRamTypes(raw: string): Array<'DDR3' | 'DDR4' | 'DDR5'> {
  const types: Array<'DDR3' | 'DDR4' | 'DDR5'> = [];
  if (/ddr5/i.test(raw)) types.push('DDR5');
  if (/ddr4/i.test(raw)) types.push('DDR4');
  if (/ddr3/i.test(raw)) types.push('DDR3');
  return types;
}

export class NeweggCpuParser implements SpecParser {
  readonly categorySlug = 'cpu' as const;
  readonly storeName = 'Newegg';

  parse({ specTable = {}, productName = '' }: RawSpecData): SpecParseResult {
    const partial: Record<string, unknown> = {};
    const missing: string[] = [];

    // Socket
    const socketRaw = findByKeys(specTable, ['socket', 'socket type', 'cpu socket']);
    const socket = socketRaw ? normalizeSocket(socketRaw) : undefined;
    if (socket && CpuSocketEnum.options.includes(socket as never)) {
      partial.socket = socket;
    } else {
      missing.push('socket');
    }

    // TDP
    const tdpRaw = findByKeys(specTable, ['tdp', 'thermal design power', 'processor tdp']);
    const tdp = parseIntValue(tdpRaw);
    if (tdp) partial.tdp = tdp;
    else missing.push('tdp');

    // Supported RAM types
    const memTypeRaw = findByKeys(specTable, ['memory type', 'memory standard', 'compatible memory']);
    const memSource = memTypeRaw ?? productName;
    const supportedRam = detectRamTypes(memSource);
    if (supportedRam.length > 0) partial.supportedRam = supportedRam;
    else missing.push('supportedRam');

    // Cores
    const coresRaw = findByKeys(specTable, ['# of cores', 'cores', 'cpu cores', 'number of cores']);
    const cores = parseIntValue(coresRaw);
    if (cores) partial.cores = cores;
    else missing.push('cores');

    // Threads
    const threadsRaw = findByKeys(specTable, ['# of threads', 'threads', 'cpu threads']);
    const threads = parseIntValue(threadsRaw);
    if (threads) partial.threads = threads;
    else missing.push('threads');

    // Optional
    const baseRaw = findByKeys(specTable, ['base clock', 'cpu speed', 'operating frequency', 'base frequency']);
    partial.baseClockGhz = parseFloatValue(baseRaw);

    const boostRaw = findByKeys(specTable, ['boost clock', 'max turbo', 'turbo frequency', 'boost frequency']);
    partial.boostClockGhz = parseFloatValue(boostRaw);

    const igpRaw = findByKeys(specTable, ['integrated graphics', 'graphics']);
    if (igpRaw) partial.integratedGraphics = !/no|none/i.test(igpRaw);

    const result = CpuSpecSchema.safeParse(partial);
    return {
      data: result.success ? result.data : undefined,
      partial,
      missing,
    };
  }
}
