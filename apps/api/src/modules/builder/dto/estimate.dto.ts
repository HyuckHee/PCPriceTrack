import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { UsageType } from '../build-presets';

export class EstimateRequestDto {
  @IsInt()
  @Min(100000)
  @Max(100000000)
  budget: number;

  @IsEnum(['office', 'gaming-fhd', 'gaming-qhd', 'gaming-4k', 'video-editing', 'ai-workstation'])
  usage: UsageType;

  @IsOptional()
  @IsString()
  preferredCpuBrand?: 'intel' | 'amd';

  @IsOptional()
  @IsString()
  preferredGpuBrand?: 'nvidia' | 'amd';
}

export interface SelectedPart {
  category: string;
  productId: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  imageUrl?: string | null;
  specs: Record<string, unknown>;
  performanceScore?: number | null;
}

export interface EstimateResponseDto {
  parts: SelectedPart[];
  totalPrice: number;
  budgetUsed: number;
  currency: string;
  warnings: Array<{ severity: 'error' | 'warning'; rule: string; message: string }>;
  performanceSummary: {
    cpuScore: number | null;
    gpuScore: number | null;
    balanceRatio: number | null;
    label: string;
  };
}
