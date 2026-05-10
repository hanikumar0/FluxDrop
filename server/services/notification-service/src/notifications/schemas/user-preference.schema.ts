import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UserPreference extends Document {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ default: true })
  pushEnabled: boolean;

  @Prop({ default: true })
  smsEnabled: boolean;

  @Prop({ default: true })
  emailEnabled: boolean;

  @Prop({ type: Object, default: {} })
  preferences: any;
}

export const UserPreferenceSchema = SchemaFactory.createForClass(UserPreference);
