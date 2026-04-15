import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrackingGateway } from './gateways/tracking.gateway';
import { Tracking, TrackingSchema } from './schemas/tracking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tracking.name, schema: TrackingSchema }]),
  ],
  providers: [TrackingGateway],
})
export class TrackingModule {}
