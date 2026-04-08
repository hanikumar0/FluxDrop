import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRestaurantDto } from '../dtos';

@Injectable()
export class RestaurantService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateRestaurantDto) {
    return this.prisma.restaurant.create({
      data: {
        ...dto,
        ownerId,
      },
    });
  }

  async findAll() {
    return this.prisma.restaurant.findMany({
      where: { isOperational: true },
    });
  }

  async findOne(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async updateStatus(id: string, isOperational: boolean) {
    return this.prisma.restaurant.update({
      where: { id },
      data: { isOperational },
    });
  }
}
