import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from '../dtos/create-order.dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async createOrder(customerId: string, dto: CreateOrderDto) {
    // Transactional Outbox Pattern Implementation
    return this.prisma.$transaction(async (tx) => {
      // 1. Create Order
      const order = await tx.order.create({
        data: {
          customerId,
          restaurantId: dto.restaurantId,
          totalAmount: dto.totalAmount,
          deliveryAddress: dto.deliveryAddress,
          items: dto.items as any,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      // 2. Create Outbox Event
      await tx.outboxEvent.create({
        data: {
          orderId: order.id,
          type: 'order.created',
          payload: {
            orderId: order.id,
            customerId,
            restaurantId: dto.restaurantId,
            totalAmount: dto.totalAmount,
          } as any,
        },
      });

      return order;
    });
  }

  async findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { outboxEvents: true },
    });
  }

  async updateStatus(id: string, status: any) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }
}
