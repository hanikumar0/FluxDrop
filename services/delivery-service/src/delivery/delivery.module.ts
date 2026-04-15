import { Module } from '@nestjs/common';
import { DeliveryController } from './controllers/delivery.controller';
import { DeliveryService } from './services/delivery.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [DeliveryController],
  providers: [DeliveryService, PrismaService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
