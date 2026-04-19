import { z } from 'zod';

export const PowerConnectorEnum = z.enum([
  'NONE',
  '6PIN',
  '8PIN',
  '6+2PIN',
  '2x8PIN',
  '3x8PIN',
  '12VHPWR',
  '12V2x6',
]);
export type PowerConnector = z.infer<typeof PowerConnectorEnum>;

export const PcieInterfaceEnum = z.enum(['PCIe3x16', 'PCIe4x16', 'PCIe4x8', 'PCIe5x16']);
export type PcieInterface = z.infer<typeof PcieInterfaceEnum>;

export const GpuSpecSchema = z.object({
  lengthMm: z.number().positive(),
  widthSlots: z.number().positive(),
  heightMm: z.number().positive().optional(),
  tdp: z.number().int().positive(),
  vramGb: z.number().int().positive(),
  powerConnectors: z.array(PowerConnectorEnum).min(1),
  recommendedPsuWattage: z.number().int().positive().optional(),
  pcieInterface: PcieInterfaceEnum.optional(),
  chipset: z.string().optional(),
});

export type GpuSpec = z.infer<typeof GpuSpecSchema>;
