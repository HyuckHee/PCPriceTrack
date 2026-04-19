import {
  StorageFormFactorEnum,
  StorageInterfaceEnum,
  StorageSpecSchema,
  StorageTypeEnum,
} from '../../../../products/specs';
import { RawSpecData, SpecParseResult, SpecParser } from '../spec-parser.interface';
import { findByKeys, parseIntValue } from '../parse-utils';

function parseInterface(raw: string, name: string): string | undefined {
  const src = `${raw} ${name}`.toLowerCase();
  if (/pcie\s*5|gen\s*5/.test(src)) return 'NVMe_PCIe5x4';
  if (/pcie\s*4|gen\s*4/.test(src)) return 'NVMe_PCIe4x4';
  if (/nvme|pcie\s*3|gen\s*3|m\.2/.test(src) && !/sata/.test(src)) return 'NVMe_PCIe3x4';
  if (/sata/.test(src)) return 'SATA3';
  return undefined;
}

function parseFormFactor(raw: string, name: string): string | undefined {
  const src = `${raw} ${name}`.toLowerCase();
  if (/2230/.test(src)) return 'M2_2230';
  if (/22110/.test(src)) return 'M2_22110';
  if (/2280|m\.2/.test(src)) return 'M2_2280';
  if (/u\.2|u2/.test(src)) return 'U.2';
  if (/3\.5|3.5/.test(src)) return '3.5';
  if (/2\.5|2.5/.test(src)) return '2.5';
  return undefined;
}

function parseCapacityGb(raw: string, name: string): number | undefined {
  const src = raw || name;
  // "2 TB" → 2000, "500 GB" → 500
  const tbMatch = src.match(/([\d.]+)\s*tb/i);
  if (tbMatch) return Math.round(parseFloat(tbMatch[1]) * 1000);
  const gbMatch = src.match(/(\d+)\s*gb/i);
  if (gbMatch) return parseInt(gbMatch[1], 10);
  return undefined;
}

export class NeweggStorageParser implements SpecParser {
  readonly categorySlug: 'ssd' | 'hdd';
  readonly storeName = 'Newegg';

  constructor(slug: 'ssd' | 'hdd') {
    this.categorySlug = slug;
  }

  parse({ specTable = {}, productName = '' }: RawSpecData): SpecParseResult {
    const partial: Record<string, unknown> = {};
    const missing: string[] = [];

    // Storage type
    partial.storageType = this.categorySlug === 'ssd' ? 'SSD' : 'HDD';

    // Interface
    const ifaceRaw = findByKeys(specTable, ['interface', 'form factor', 'storage interface']);
    const iface = parseInterface(ifaceRaw ?? '', productName);
    if (iface && StorageInterfaceEnum.options.includes(iface as never)) {
      partial.interface = iface;
    } else missing.push('interface');

    // Form factor
    const ffRaw = findByKeys(specTable, ['form factor', 'device type']);
    const ff = parseFormFactor(ffRaw ?? '', productName);
    if (ff && StorageFormFactorEnum.options.includes(ff as never)) {
      partial.formFactor = ff;
    } else missing.push('formFactor');

    // Capacity
    const capRaw = findByKeys(specTable, ['capacity', 'storage capacity', 'total capacity']);
    const capacityGb = parseCapacityGb(capRaw ?? '', productName);
    if (capacityGb) partial.capacityGb = capacityGb;
    else missing.push('capacityGb');

    // Sequential read/write
    const readRaw = findByKeys(specTable, ['read speed', 'sequential read', 'max sequential read']);
    partial.readMbps = parseIntValue(readRaw);

    const writeRaw = findByKeys(specTable, ['write speed', 'sequential write', 'max sequential write']);
    partial.writeMbps = parseIntValue(writeRaw);

    // HDD RPM
    if (this.categorySlug === 'hdd') {
      const rpmRaw = findByKeys(specTable, ['rpm', 'spindle speed', 'rotational speed']);
      partial.rpm = parseIntValue(rpmRaw);
    }

    // DRAM cache
    const dramRaw = findByKeys(specTable, ['dram', 'cache', 'dram cache']);
    if (dramRaw) partial.dramCache = /yes|dram/i.test(dramRaw) && !/no/i.test(dramRaw);

    const result = StorageSpecSchema.safeParse(partial);
    return { data: result.success ? result.data : undefined, partial, missing };
  }
}
