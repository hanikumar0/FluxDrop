import { IsString, IsNumber, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  restaurantId: string;

  @IsNumber()
  @IsNotEmpty()
  totalAmount: number;

  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;

  @IsArray()
  @IsNotEmpty()
  items: any[];

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
