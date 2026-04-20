import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class BuildComponentDto {
  @IsString()
  category: string;

  @IsString()
  categoryName: string;

  @IsUUID()
  productId: string;

  @IsString()
  productName: string;

  @IsString()
  slug: string;

  @IsString()
  brand: string;

  @IsOptional()
  @IsString()
  imageUrl: string | null;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  storeUrl: string | null;

  @IsOptional()
  @IsString()
  storeName: string | null;

  @IsBoolean()
  inStock: boolean;

  @IsOptional()
  @IsNumber()
  budgetAllocation?: number;

  @IsOptional()
  @IsNumber()
  originalPrice?: number | null;

  @IsOptional()
  @IsNumber()
  quantity?: number;
}

export class SaveBuildDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsNumber()
  @Min(0)
  budget: number;

  @IsOptional()
  @IsIn(['USD', 'KRW'])
  currency?: string;

  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BuildComponentDto)
  components: BuildComponentDto[];
}
