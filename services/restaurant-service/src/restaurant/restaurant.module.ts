import { Module } from '@nestjs/common';
import { RestaurantController } from './controllers';
import { RestaurantService } from './services';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [RestaurantController],
  providers: [RestaurantService, PrismaService],
  exports: [RestaurantService],
})
export class RestaurantModule {}
