import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Delivery } from '../schemas/delivery.schema';
import { CreateDeliveryDto } from '../dtos';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectModel(Delivery.name) private deliveryModel: Model<Delivery>,
  ) {}

  async createDelivery(dto: CreateDeliveryDto) {
    const delivery = new this.deliveryModel({
      orderId: dto.orderId,
      restaurantLat: dto.restaurantLat,
      restaurantLng: dto.restaurantLng,
      customerLat: dto.customerLat,
      customerLng: dto.customerLng,
    });
    return delivery.save();
  }

  async assignRider(id: string, riderId: string) {
    return this.deliveryModel.findByIdAndUpdate(
      id,
      {
        riderId,
        status: 'ASSIGNED',
        assignedAt: new Date(),
      },
      { new: true }
    ).exec();
  }

  async updateStatus(id: string, status: any) {
    const update: any = { status };
    if (status === 'PICKED_UP') update.pickedUpAt = new Date();
    if (status === 'DELIVERED') update.deliveredAt = new Date();

    return this.deliveryModel.findByIdAndUpdate(
      id,
      update,
      { new: true }
    ).exec();
  }

  async getDeliveryByOrder(orderId: string) {
    const delivery = await this.deliveryModel.findOne({ orderId }).exec();
    if (!delivery) throw new NotFoundException('Delivery not found');
    return delivery;
  }
}
