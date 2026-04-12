import { IsIn, IsNumber, IsObject, IsOptional, Min } from 'class-validator';

export class EstimateBuildDto {
  @IsNumber()
  @Min(100)
  budget: number;

  @IsOptional()
  @IsIn(['USD', 'KRW'])
  currency?: string = 'USD';

  /**
   * Custom budget allocation ratios per category slug.
   * Values are fractions (e.g. 0.35) and should sum to ~1.0.
   * If omitted or incomplete, falls back to server-side defaults.
   */
  @IsOptional()
  @IsObject()
  ratios?: Record<string, number>;
}
