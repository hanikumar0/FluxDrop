import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Delivery extends Document {
  @Prop({ required: true, unique: true })
  orderId: string;

  @Prop()
  riderId: string;

  @Prop({ required: true })
  restaurantLat: number;

  @Prop({ required: true })
  restaurantLng: number;

  @Prop({ required: true })
  customerLat: number;

  @Prop({ required: true })
  customerLng: number;

  @Prop({ default: 'PENDING' })
  status: string;

  @Prop()
  assignedAt: Date;

  @Prop()
  pickedUpAt: Date;

  @Prop()
  deliveredAt: Date;
}

export const DeliverySchema = SchemaFactory.createForClass(Delivery);
