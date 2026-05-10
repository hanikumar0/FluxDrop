import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Restaurant extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  cuisine: string;

  @Prop({ required: true })
  ownerId: string;

  @Prop({ default: true })
  isOperational: boolean;

  @Prop({ type: [String], default: [] })
  menuItems: string[];
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);
