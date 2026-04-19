import { z } from 'zod';
import { CpuSpecSchema, CpuSpec } from './cpu.spec';
import { MotherboardSpecSchema, MotherboardSpec } from './motherboard.spec';
import { RamSpecSchema, RamSpec } from './ram.spec';
import { GpuSpecSchema, GpuSpec } from './gpu.spec';
import { PsuSpecSchema, PsuSpec } from './psu.spec';
import { CaseSpecSchema, CaseSpec } from './case.spec';
import { CoolerSpecSchema, CoolerSpec } from './cooler.spec';
import { StorageSpecSchema, StorageSpec } from './storage.spec';

export * from './cpu.spec';
export * from './motherboard.spec';
export * from './ram.spec';
export * from './gpu.spec';
export * from './psu.spec';
export * from './case.spec';
export * from './cooler.spec';
export * from './storage.spec';

export const CategorySlug = {
  CPU: 'cpu',
  MOTHERBOARD: 'motherboard',
  RAM: 'ram',
  GPU: 'gpu',
  PSU: 'psu',
  CASE: 'case',
  COOLER: 'cooler',
  SSD: 'ssd',
  HDD: 'hdd',
} as const;

export type CategorySlug = (typeof CategorySlug)[keyof typeof CategorySlug];

export const CategorySpecSchemaMap = {
  [CategorySlug.CPU]: CpuSpecSchema,
  [CategorySlug.MOTHERBOARD]: MotherboardSpecSchema,
  [CategorySlug.RAM]: RamSpecSchema,
  [CategorySlug.GPU]: GpuSpecSchema,
  [CategorySlug.PSU]: PsuSpecSchema,
  [CategorySlug.CASE]: CaseSpecSchema,
  [CategorySlug.COOLER]: CoolerSpecSchema,
  [CategorySlug.SSD]: StorageSpecSchema,
  [CategorySlug.HDD]: StorageSpecSchema,
} as const;

export type CategorySpecMap = {
  [CategorySlug.CPU]: CpuSpec;
  [CategorySlug.MOTHERBOARD]: MotherboardSpec;
  [CategorySlug.RAM]: RamSpec;
  [CategorySlug.GPU]: GpuSpec;
  [CategorySlug.PSU]: PsuSpec;
  [CategorySlug.CASE]: CaseSpec;
  [CategorySlug.COOLER]: CoolerSpec;
  [CategorySlug.SSD]: StorageSpec;
  [CategorySlug.HDD]: StorageSpec;
};

export type AnySpec =
  | CpuSpec
  | MotherboardSpec
  | RamSpec
  | GpuSpec
  | PsuSpec
  | CaseSpec
  | CoolerSpec
  | StorageSpec;

export type SpecValidationResult<T extends CategorySlug> =
  | { success: true; data: CategorySpecMap[T]; partial: Partial<CategorySpecMap[T]> }
  | { success: false; error: z.ZodError; partial: Partial<CategorySpecMap[T]> };

export function validateSpec<T extends CategorySlug>(
  category: T,
  data: unknown,
): SpecValidationResult<T> {
  const schema = CategorySpecSchemaMap[category] as unknown as z.ZodType<CategorySpecMap[T]>;
  const result = schema.safeParse(data);
  const partial =
    data && typeof data === 'object' ? (data as Partial<CategorySpecMap[T]>) : ({} as Partial<CategorySpecMap[T]>);
  if (result.success) {
    return { success: true, data: result.data, partial };
  }
  return { success: false, error: result.error, partial };
}
