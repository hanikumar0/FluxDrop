import { Controller, Post, Get, Body, Param, Patch } from '@nestjs/common';
import { OrderService } from '../services/order.service';
import { CreateOrderDto } from '../dtos/create-order.dto';

@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  async create(@Body() dto: CreateOrderDto) {
    // In production, customerId would come from the JWT via a Guard
    const customerId = 'test-customer-id';
    return this.orderService.createOrder(customerId, dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.orderService.updateStatus(id, status);
  }
}
