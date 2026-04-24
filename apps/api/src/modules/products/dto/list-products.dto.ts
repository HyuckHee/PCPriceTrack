import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListProductsDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  /** 쉼표 구분 복수 브랜드 필터 (예: "NVIDIA,AMD") */
  @IsOptional()
  @IsString()
  brands?: string;

  @IsOptional()
  @IsString()
  search?: string;

  /** JSON 스펙 필터 (예: '{"cores":{"gte":8}}') */
  @IsOptional()
  @IsString()
  specs?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPerfScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPerfScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(['newest', 'popular', 'price_asc', 'price_desc', 'name', 'value_score'])
  sortBy?: string = 'newest';
}
