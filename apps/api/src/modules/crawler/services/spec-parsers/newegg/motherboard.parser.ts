import {
  FormFactorEnum,
  MotherboardSpec,
  MotherboardSpecSchema,
} from '../../../../products/specs';
import { CpuSocketEnum, RamTypeEnum } from '../../../../products/specs';
import { RawSpecData, SpecParseResult, SpecParser } from '../spec-parser.interface';
import { findByKeys, parseIntValue } from '../parse-utils';

const SOCKET_MAP: Record<string, string> = {
  'lga1700': 'LGA1700', 'lga 1700': 'LGA1700',
  'lga1851': 'LGA1851', 'lga 1851': 'LGA1851',
  'lga1200': 'LGA1200', 'lga 1200': 'LGA1200',
  'lga2066': 'LGA2066', 'lga 2066': 'LGA2066',
  'am4': 'AM4', 'am5': 'AM5',
  'strx4': 'sTRX4', 'str5': 'sTR5',
};

const FORM_FACTOR_MAP: Record<string, string> = {
  'e-atx': 'EATX', 'eatx': 'EATX', 'xl-atx': 'XLATX', 'xlatx': 'XLATX',
  'atx': 'ATX',
  'micro atx': 'MicroATX', 'matx': 'MicroATX', 'micro-atx': 'MicroATX', 'microatx': 'MicroATX',
  'mini itx': 'MiniITX', 'mini-itx': 'MiniITX', 'miniitx': 'MiniITX',
};

function normalizeFormFactor(raw: string): string | undefined {
  const key = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const [alias, value] of Object.entries(FORM_FACTOR_MAP)) {
    if (key.includes(alias)) return value;
  }
  return undefined;
}

function normalizeSocket(raw: string): string | undefined {
  const key = raw.toLowerCase().replace(/\s+/g, '');
  for (const [alias, value] of Object.entries(SOCKET_MAP)) {
    if (key.includes(alias.replace(/\s+/g, ''))) return value;
  }
  return undefined;
}

export class NeweggMotherboardParser implements SpecParser {
  readonly categorySlug = 'motherboard' as const;
  readonly storeName = 'Newegg';

  parse({ specTable = {} }: RawSpecData): SpecParseResult {
    const partial: Record<string, unknown> = {};
    const missing: string[] = [];

    // Socket
    const socketRaw = findByKeys(specTable, ['socket', 'cpu socket', 'socket type']);
    const socket = socketRaw ? normalizeSocket(socketRaw) : undefined;
    if (socket && CpuSocketEnum.options.includes(socket as never)) {
      partial.socket = socket;
    } else missing.push('socket');

    // Form factor
    const ffRaw = findByKeys(specTable, ['form factor', 'motherboard form factor']);
    const formFactor = ffRaw ? normalizeFormFactor(ffRaw) : undefined;
    if (formFactor && FormFactorEnum.options.includes(formFactor as never)) {
      partial.formFactor = formFactor;
    } else missing.push('formFactor');

    // RAM type
    const ramTypeRaw = findByKeys(specTable, ['memory type', 'memory standard']);
    let ramType: string | undefined;
    if (ramTypeRaw) {
      if (/ddr5/i.test(ramTypeRaw)) ramType = 'DDR5';
      else if (/ddr4/i.test(ramTypeRaw)) ramType = 'DDR4';
      else if (/ddr3/i.test(ramTypeRaw)) ramType = 'DDR3';
    }
    if (ramType && RamTypeEnum.options.includes(ramType as never)) {
      partial.ramType = ramType;
    } else missing.push('ramType');

    // RAM slots
    const slotsRaw = findByKeys(specTable, ['memory slots', 'dimm slots', 'number of memory slots']);
    const ramSlots = parseIntValue(slotsRaw);
    if (ramSlots) partial.ramSlots = ramSlots;
    else missing.push('ramSlots');

    // Max RAM
    const maxRamRaw = findByKeys(specTable, ['maximum memory', 'max memory', 'max memory supported']);
    const maxRamGb = parseIntValue(maxRamRaw);
    if (maxRamGb) partial.maxRamGb = maxRamGb;
    else missing.push('maxRamGb');

    // M.2 slots
    const m2Raw = findByKeys(specTable, ['m.2 slots', 'm2 slots', 'onboard m.2']);
    partial.m2Slots = parseIntValue(m2Raw) ?? 0;

    // SATA ports
    const sataRaw = findByKeys(specTable, ['sata 6gb/s', 'sata ports', 'sata iii']);
    partial.sataPorts = parseIntValue(sataRaw);

    // Chipset
    const chipsetRaw = findByKeys(specTable, ['chipset', 'north bridge', 'platform']);
    if (chipsetRaw) partial.chipset = chipsetRaw;

    const result = MotherboardSpecSchema.safeParse(partial);
    return { data: result.success ? result.data : undefined, partial, missing };
  }
}
