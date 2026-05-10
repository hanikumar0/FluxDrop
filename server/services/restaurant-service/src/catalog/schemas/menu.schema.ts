import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MenuDocument = Menu & Document;

@Schema()
class VariantOption {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;
}

@Schema()
class Variant {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [VariantOption] })
  options: VariantOption[];
}

@Schema()
class MenuItem {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop()
  description: string;

  @Prop()
  imageUrl: string;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ type: [Variant] })
  variants: Variant[];
}

@Schema()
class Category {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [MenuItem] })
  items: MenuItem[];
}

@Schema({ timestamps: true })
export class Menu {
  @Prop({ required: true, index: true })
  restaurantId: string;

  @Prop({ type: [Category] })
  categories: Category[];
}

export const MenuSchema = SchemaFactory.createForClass(Menu);
