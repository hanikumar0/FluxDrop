import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Menu, MenuDocument } from '../schemas/menu.schema';

@Injectable()
export class CatalogService {
  constructor(@InjectModel(Menu.name) private menuModel: Model<MenuDocument>) {}

  async createOrUpdateMenu(restaurantId: string, categories: any[]) {
    return this.menuModel.findOneAndUpdate(
      { restaurantId },
      { categories },
      { upsert: true, new: true },
    );
  }

  async getMenu(restaurantId: string) {
    const menu = await this.menuModel.findOne({ restaurantId });
    if (!menu) {
      throw new NotFoundException('Menu not found for this restaurant');
    }
    return menu;
  }

  async updateItemAvailability(restaurantId: string, itemName: string, isAvailable: boolean) {
    // This is a simplified update logic. In production, we would use more precise positional operators.
    const menu = await this.menuModel.findOne({ restaurantId });
    if (!menu) throw new NotFoundException('Menu not found');

    for (const category of menu.categories) {
      for (const item of category.items) {
        if (item.name === itemName) {
          item.isAvailable = isAvailable;
        }
      }
    }

    return menu.save();
  }
}
