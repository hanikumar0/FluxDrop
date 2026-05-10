import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { DeliveryService } from '../services/delivery.service';
import { CreateDeliveryDto } from '../dtos/create-delivery.dto';

@Controller('deliveries')
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Post()
  async create(@Body() dto: CreateDeliveryDto) {
    return this.deliveryService.createDelivery(dto);
  }

  @Patch(':id/assign')
  async assign(@Param('id') id: string, @Body('riderId') riderId: string) {
    return this.deliveryService.assignRider(id, riderId);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.deliveryService.updateStatus(id, status);
  }

  @Get('order/:orderId')
  async getByOrder(@Param('orderId') orderId: string) {
    return this.deliveryService.getDeliveryByOrder(orderId);
  }
}
