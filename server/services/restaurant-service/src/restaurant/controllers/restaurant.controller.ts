import { Controller, Post, Get, Body, Param, Patch } from '@nestjs/common';
import { RestaurantService } from '../services/restaurant.service';
import { CreateRestaurantDto } from '../dtos/create-restaurant.dto';

@Controller('restaurants')
export class RestaurantController {
  constructor(private restaurantService: RestaurantService) {}

  @Post()
  async create(@Body() dto: CreateRestaurantDto) {
    // In production, ownerId would come from the JWT via a Guard
    const ownerId = 'system-owner'; 
    return this.restaurantService.create(ownerId, dto);
  }

  @Get()
  async findAll() {
    return this.restaurantService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.restaurantService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('isOperational') isOperational: boolean) {
    return this.restaurantService.updateStatus(id, isOperational);
  }
}
