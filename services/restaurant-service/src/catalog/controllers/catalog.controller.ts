import { Controller, Post, Get, Body, Param, Patch } from '@nestjs/common';
import { CatalogService } from '../services/catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Post(':restaurantId/menu')
  async createOrUpdateMenu(@Param('restaurantId') restaurantId: string, @Body('categories') categories: any[]) {
    return this.catalogService.createOrUpdateMenu(restaurantId, categories);
  }

  @Get(':restaurantId/menu')
  async getMenu(@Param('restaurantId') restaurantId: string) {
    return this.catalogService.getMenu(restaurantId);
  }

  @Patch(':restaurantId/items/:itemName/availability')
  async updateItemAvailability(
    @Param('restaurantId') restaurantId: string,
    @Param('itemName') itemName: string,
    @Body('isAvailable') isAvailable: boolean,
  ) {
    return this.catalogService.updateItemAvailability(restaurantId, itemName, isAvailable);
  }
}
