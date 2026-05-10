import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant } from '../schemas/restaurant.schema';
import { CreateRestaurantDto } from '../dtos';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<Restaurant>,
  ) {}

  async create(ownerId: string, dto: CreateRestaurantDto) {
    const createdRestaurant = new this.restaurantModel({
      ...dto,
      ownerId,
    });
    return createdRestaurant.save();
  }

  async findAll() {
    return this.restaurantModel.find({ isOperational: true }).exec();
  }

  async findOne(id: string) {
    const restaurant = await this.restaurantModel.findById(id).exec();

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async updateStatus(id: string, isOperational: boolean) {
    const restaurant = await this.restaurantModel
      .findByIdAndUpdate(id, { isOperational }, { new: true })
      .exec();
    
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    
    return restaurant;
  }
}
