import { z } from 'zod';

export const StorageInterfaceEnum = z.enum([
  'NVMe_PCIe3x4',
  'NVMe_PCIe4x4',
  'NVMe_PCIe5x4',
  'SATA3',
  'SAS',
]);
export type StorageInterface = z.infer<typeof StorageInterfaceEnum>;

export const StorageFormFactorEnum = z.enum(['M2_2280', 'M2_2230', 'M2_22110', '2.5', '3.5', 'U.2']);
export type StorageFormFactor = z.infer<typeof StorageFormFactorEnum>;

export const StorageTypeEnum = z.enum(['SSD', 'HDD', 'HYBRID']);
export type StorageType = z.infer<typeof StorageTypeEnum>;

export const StorageSpecSchema = z.object({
  storageType: StorageTypeEnum,
  interface: StorageInterfaceEnum,
  formFactor: StorageFormFactorEnum,
  capacityGb: z.number().int().positive(),
  readMbps: z.number().int().positive().optional(),
  writeMbps: z.number().int().positive().optional(),
  rpm: z.number().int().positive().optional(),
  dramCache: z.boolean().optional(),
});

export type StorageSpec = z.infer<typeof StorageSpecSchema>;
