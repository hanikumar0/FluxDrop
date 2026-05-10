import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TrackingDocument = Tracking & Document;

@Schema()
class Coordinate {
  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lng: number;

  @Prop({ default: Date.now })
  timestamp: Date;
}

@Schema({ timestamps: true })
export class Tracking {
  @Prop({ required: true, index: true })
  deliveryId: string;

  @Prop({ required: true, index: true })
  riderId: string;

  @Prop({ type: [Coordinate] })
  path: Coordinate[];
}

export const TrackingSchema = SchemaFactory.createForClass(Tracking);
