import { z } from 'zod';
import { FormFactorEnum } from './motherboard.spec';
import { PsuFormFactorEnum } from './psu.spec';

export const CaseTypeEnum = z.enum(['FULL_TOWER', 'MID_TOWER', 'MINI_TOWER', 'SFF', 'HTPC', 'OPEN_FRAME']);
export type CaseType = z.infer<typeof CaseTypeEnum>;

export const RadiatorSizeEnum = z.enum(['120', '140', '240', '280', '360', '420']);
export type RadiatorSize = z.infer<typeof RadiatorSizeEnum>;

export const CaseSpecSchema = z.object({
  caseType: CaseTypeEnum.optional(),
  supportedFormFactors: z.array(FormFactorEnum).min(1),
  maxGpuLengthMm: z.number().positive(),
  maxCoolerHeightMm: z.number().positive(),
  psuFormFactor: PsuFormFactorEnum,
  maxPsuLengthMm: z.number().positive().optional(),
  supportedRadiators: z.array(RadiatorSizeEnum).optional(),
  drive25Bays: z.number().int().nonnegative().optional(),
  drive35Bays: z.number().int().nonnegative().optional(),
});

export type CaseSpec = z.infer<typeof CaseSpecSchema>;
