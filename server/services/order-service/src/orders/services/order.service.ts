import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateOrderDto } from '../dtos/create-order.dto';

@Injectable()
export class OrderService {
  constructor(private db: DatabaseService) {}

  async createOrder(customerId: string, dto: CreateOrderDto) {
    // Transactional Outbox Pattern Implementation using raw SQL
    await this.db.query('BEGIN');
    try {
      // 1. Create Order
      const orderResult = await this.db.query(
        'INSERT INTO "Order" (id, "customerId", "restaurantId", "totalAmount", "deliveryAddress", items, "idempotencyKey", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
        [customerId, dto.restaurantId, dto.totalAmount, dto.deliveryAddress, JSON.stringify(dto.items), dto.idempotencyKey],
      );

      const order = orderResult.rows[0];

      // 2. Create Outbox Event
      await this.db.query(
        'INSERT INTO "OutboxEvent" (id, "orderId", type, payload, "createdAt") VALUES (gen_random_uuid(), $1, $2, $3, NOW())',
        [order.id, 'order.created', JSON.stringify({
          orderId: order.id,
          customerId,
          restaurantId: dto.restaurantId,
          totalAmount: dto.totalAmount,
        })],
      );

      await this.db.query('COMMIT');
      return order;
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  async findOne(id: string) {
    const orderResult = await this.db.query(
      'SELECT * FROM "Order" WHERE id = $1',
      [id],
    );
    const order = orderResult.rows[0];

    if (order) {
      const outboxResult = await this.db.query(
        'SELECT * FROM "OutboxEvent" WHERE "orderId" = $1',
        [id],
      );
      order.outboxEvents = outboxResult.rows;
    }

    return order;
  }

  async updateStatus(id: string, status: any) {
    const result = await this.db.query(
      'UPDATE "Order" SET status = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *',
      [status, id],
    );
    return result.rows[0];
  }
}
