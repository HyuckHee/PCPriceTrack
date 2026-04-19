import { z } from 'zod';
import { RamTypeEnum } from './cpu.spec';

export const RamSpecSchema = z.object({
  type: RamTypeEnum,
  capacityGb: z.number().int().positive(),
  modules: z.number().int().positive(),
  moduleCapacityGb: z.number().int().positive(),
  speedMhz: z.number().int().positive(),
  casLatency: z.number().int().positive().optional(),
  eccSupport: z.boolean().optional(),
  heightMm: z.number().positive().optional(),
});

export type RamSpec = z.infer<typeof RamSpecSchema>;
