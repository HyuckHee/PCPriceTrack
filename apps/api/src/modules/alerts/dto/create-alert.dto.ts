import { IsNumber, IsPositive, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAlertDto {
  @IsUUID()
  productId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  targetPrice: number;
}
