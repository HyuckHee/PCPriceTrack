import { z } from 'zod';
import { CpuSocketEnum, RamTypeEnum } from './cpu.spec';

export const FormFactorEnum = z.enum(['ATX', 'MicroATX', 'MiniITX', 'EATX', 'XLATX']);
export type FormFactor = z.infer<typeof FormFactorEnum>;

export const M2InterfaceEnum = z.enum(['PCIe3x4', 'PCIe4x4', 'PCIe5x4', 'SATA']);
export type M2Interface = z.infer<typeof M2InterfaceEnum>;

export const MotherboardSpecSchema = z.object({
  socket: CpuSocketEnum,
  formFactor: FormFactorEnum,
  ramType: RamTypeEnum,
  ramSlots: z.number().int().positive(),
  maxRamGb: z.number().int().positive(),
  maxRamSpeedMhz: z.number().int().positive().optional(),
  m2Slots: z.number().int().nonnegative(),
  m2Interfaces: z.array(M2InterfaceEnum).optional(),
  sataPorts: z.number().int().nonnegative().optional(),
  chipset: z.string().optional(),
  pcieX16Slots: z.number().int().nonnegative().optional(),
});

export type MotherboardSpec = z.infer<typeof MotherboardSpecSchema>;
