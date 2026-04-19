import { z } from 'zod';

export const CpuSocketEnum = z.enum([
  'LGA1700',
  'LGA1851',
  'LGA1200',
  'LGA2066',
  'AM4',
  'AM5',
  'sTRX4',
  'sTR5',
]);
export type CpuSocket = z.infer<typeof CpuSocketEnum>;

export const RamTypeEnum = z.enum(['DDR3', 'DDR4', 'DDR5']);
export type RamType = z.infer<typeof RamTypeEnum>;

export const CpuSpecSchema = z.object({
  socket: CpuSocketEnum,
  tdp: z.number().int().positive(),
  supportedRam: z.array(RamTypeEnum).min(1),
  cores: z.number().int().positive(),
  threads: z.number().int().positive(),
  baseClockGhz: z.number().positive().optional(),
  boostClockGhz: z.number().positive().optional(),
  integratedGraphics: z.boolean().optional(),
});

export type CpuSpec = z.infer<typeof CpuSpecSchema>;
