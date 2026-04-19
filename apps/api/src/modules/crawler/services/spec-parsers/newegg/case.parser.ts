import {
  CaseSpecSchema,
  CaseTypeEnum,
  FormFactorEnum,
  PsuFormFactorEnum,
  RadiatorSizeEnum,
} from '../../../../products/specs';
import { RawSpecData, SpecParseResult, SpecParser } from '../spec-parser.interface';
import { findByKeys, parseMm } from '../parse-utils';

const FORM_FACTOR_MAP: Record<string, string> = {
  'e-atx': 'EATX', 'eatx': 'EATX',
  'atx': 'ATX',
  'micro atx': 'MicroATX', 'matx': 'MicroATX', 'micro-atx': 'MicroATX', 'microatx': 'MicroATX',
  'mini itx': 'MiniITX', 'mini-itx': 'MiniITX', 'miniitx': 'MiniITX',
};

function parseFormFactors(raw: string): Array<typeof FormFactorEnum._type> {
  const result: Array<typeof FormFactorEnum._type> = [];
  const lower = raw.toLowerCase();
  if (/e.?atx|eatx/.test(lower)) result.push('EATX');
  if (/\batx\b/.test(lower)) result.push('ATX');
  if (/micro.?atx|matx/.test(lower)) result.push('MicroATX');
  if (/mini.?itx|miniitx/.test(lower)) result.push('MiniITX');
  return result.length ? result : ['ATX'];
}

function parseRadiatorSizes(raw: string): Array<typeof RadiatorSizeEnum._type> {
  const sizes: Array<typeof RadiatorSizeEnum._type> = [];
  const candidates: Array<typeof RadiatorSizeEnum._type> = ['420', '360', '280', '240', '140', '120'];
  for (const size of candidates) {
    if (raw.includes(size)) sizes.push(size);
  }
  return sizes;
}

export class NeweggCaseParser implements SpecParser {
  readonly categorySlug = 'case' as const;
  readonly storeName = 'Newegg';

  parse({ specTable = {}, productName = '' }: RawSpecData): SpecParseResult {
    const partial: Record<string, unknown> = {};
    const missing: string[] = [];

    // Supported form factors
    const ffRaw = findByKeys(specTable, ['motherboard compatibility', 'compatible motherboard', 'form factor support', 'atx support']);
    partial.supportedFormFactors = parseFormFactors(ffRaw ?? '');

    // Max GPU length
    const gpuLenRaw = findByKeys(specTable, ['max gpu length', 'maximum gpu length', 'graphics card length', 'vga card length', 'gpu clearance']);
    const maxGpuLengthMm = parseMm(gpuLenRaw);
    if (maxGpuLengthMm) partial.maxGpuLengthMm = maxGpuLengthMm;
    else missing.push('maxGpuLengthMm');

    // Max cooler height
    const coolerRaw = findByKeys(specTable, ['cpu cooler height', 'max cpu cooler height', 'cooler clearance', 'cpu cooler clearance']);
    const maxCoolerHeightMm = parseMm(coolerRaw);
    if (maxCoolerHeightMm) partial.maxCoolerHeightMm = maxCoolerHeightMm;
    else missing.push('maxCoolerHeightMm');

    // PSU form factor
    const psuRaw = findByKeys(specTable, ['psu form factor', 'power supply type', 'power supply form factor']);
    let psuFormFactor = 'ATX';
    if (psuRaw) {
      const s = psuRaw.toLowerCase();
      if (s.includes('sfx-l')) psuFormFactor = 'SFX-L';
      else if (s.includes('sfx')) psuFormFactor = 'SFX';
      else if (s.includes('tfx')) psuFormFactor = 'TFX';
      else if (s.includes('flex')) psuFormFactor = 'FlexATX';
    }
    partial.psuFormFactor = psuFormFactor;

    // Radiator support
    const radRaw = findByKeys(specTable, ['radiator support', 'liquid cooling', 'aio support', 'water cooling']);
    if (radRaw) partial.supportedRadiators = parseRadiatorSizes(radRaw);

    // Case type from product name / spec
    const typeRaw = findByKeys(specTable, ['type', 'case type', 'chassis type']);
    if (typeRaw) {
      const t = typeRaw.toLowerCase();
      if (t.includes('full tower') || t.includes('full-tower')) partial.caseType = 'FULL_TOWER';
      else if (t.includes('mid tower') || t.includes('mid-tower')) partial.caseType = 'MID_TOWER';
      else if (t.includes('mini tower')) partial.caseType = 'MINI_TOWER';
      else if (t.includes('small form') || t.includes('sff')) partial.caseType = 'SFF';
    }

    const result = CaseSpecSchema.safeParse(partial);
    return { data: result.success ? result.data : undefined, partial, missing };
  }
}
