import { IsIn, IsNumber, IsOptional, Min } from 'class-validator';

export class EstimateBuildDto {
  @IsNumber()
  @Min(100)
  budget: number;

  @IsOptional()
  @IsIn(['USD', 'KRW'])
  currency?: string = 'USD';
}
