import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliveryModule } from './delivery/delivery.module';
import { TrackingModule } from './tracking/tracking.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://admin:rootpassword@localhost:27017/fluxdrop_tracking?authSource=admin',
      }),
      inject: [ConfigService],
    }),
    DeliveryModule,
    TrackingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
