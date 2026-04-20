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
  categoryName: string;
  productId: string;
  productName: string;
  slug: string;
  brand: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  storeUrl: string | null;
  storeName: string | null;
  inStock: boolean;
  specs: Record<string, unknown>;
  performanceScore?: number | null;
  quantity?: number;
}

export interface EstimateResponseDto {
  budget: number;
  currency: string;
  totalPrice: number;
  budgetUsed: number;
  components: SelectedPart[];
  warnings: Array<{ severity: 'error' | 'warning'; rule: string; message: string }>;
  performanceSummary: {
    cpuScore: number | null;
    gpuScore: number | null;
    balanceRatio: number | null;
    label: string;
  };
}
