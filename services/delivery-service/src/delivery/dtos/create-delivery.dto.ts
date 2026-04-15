import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateDeliveryDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsNumber()
  @IsNotEmpty()
  restaurantLat: number;

  @IsNumber()
  @IsNotEmpty()
  restaurantLng: number;

  @IsNumber()
  @IsNotEmpty()
  customerLat: number;

  @IsNumber()
  @IsNotEmpty()
  customerLng: number;
}
