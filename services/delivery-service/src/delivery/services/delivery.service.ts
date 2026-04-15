import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeliveryDto } from '../dtos';

@Injectable()
export class DeliveryService {
  constructor(private prisma: PrismaService) {}

  async createDelivery(dto: CreateDeliveryDto) {
    return this.prisma.delivery.create({
      data: {
        orderId: dto.orderId,
        restaurantLat: dto.restaurantLat,
        restaurantLng: dto.restaurantLng,
        customerLat: dto.customerLat,
        customerLng: dto.customerLng,
      },
    });
  }

  async assignRider(id: string, riderId: string) {
    return this.prisma.delivery.update({
      where: { id },
      data: {
        riderId,
        status: 'ASSIGNED',
        assignedAt: new Date(),
      },
    });
  }

  async updateStatus(id: string, status: any) {
    const data: any = { status };
    if (status === 'PICKED_UP') data.pickedUpAt = new Date();
    if (status === 'DELIVERED') data.deliveredAt = new Date();

    return this.prisma.delivery.update({
      where: { id },
      data,
    });
  }

  async getDeliveryByOrder(orderId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { orderId },
    });
    if (!delivery) throw new NotFoundException('Delivery not found');
    return delivery;
  }
}
