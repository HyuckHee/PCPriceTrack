import { z } from 'zod';
import { PowerConnectorEnum } from './gpu.spec';

export const PsuFormFactorEnum = z.enum(['ATX', 'SFX', 'SFX-L', 'TFX', 'FlexATX']);
export type PsuFormFactor = z.infer<typeof PsuFormFactorEnum>;

export const PsuEfficiencyEnum = z.enum([
  'STANDARD',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'TITANIUM',
]);
export type PsuEfficiency = z.infer<typeof PsuEfficiencyEnum>;

export const PsuModularityEnum = z.enum(['NON_MODULAR', 'SEMI_MODULAR', 'FULL_MODULAR']);
export type PsuModularity = z.infer<typeof PsuModularityEnum>;

export const PsuSpecSchema = z.object({
  wattage: z.number().int().positive(),
  formFactor: PsuFormFactorEnum,
  modularity: PsuModularityEnum.optional(),
  efficiency: PsuEfficiencyEnum.optional(),
  pcieConnectors: z.array(PowerConnectorEnum).optional(),
  lengthMm: z.number().positive().optional(),
});

export type PsuSpec = z.infer<typeof PsuSpecSchema>;
