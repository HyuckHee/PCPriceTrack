import { z } from 'zod';
import { CpuSocketEnum } from './cpu.spec';
import { RadiatorSizeEnum } from './case.spec';

export const CoolerTypeEnum = z.enum(['AIR', 'AIO', 'CUSTOM_LOOP']);
export type CoolerType = z.infer<typeof CoolerTypeEnum>;

export const CoolerSpecSchema = z.object({
  coolerType: CoolerTypeEnum,
  supportedSockets: z.array(CpuSocketEnum).min(1),
  tdpRating: z.number().int().positive().optional(),
  // Air cooler only
  heightMm: z.number().positive().optional(),
  // AIO only
  radiatorSize: RadiatorSizeEnum.optional(),
  radiatorThicknessMm: z.number().positive().optional(),
  fanCount: z.number().int().positive().optional(),
});

export type CoolerSpec = z.infer<typeof CoolerSpecSchema>;
