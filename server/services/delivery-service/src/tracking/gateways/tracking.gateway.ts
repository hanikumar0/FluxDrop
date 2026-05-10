import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tracking, TrackingDocument } from '../schemas/tracking.schema';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'tracking',
})
export class TrackingGateway {
  @WebSocketServer()
  server: Server;

  constructor(@InjectModel(Tracking.name) private trackingModel: Model<TrackingDocument>) {}

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody('deliveryId') deliveryId: string) {
    client.join(deliveryId);
    console.log(`Client ${client.id} joined room ${deliveryId}`);
  }

  @SubscribeMessage('updateLocation')
  async handleUpdateLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deliveryId: string; riderId: string; lat: number; lng: number },
  ) {
    const { deliveryId, riderId, lat, lng } = data;

    // 1. Broadcast to all clients in the room (e.g., the customer)
    this.server.to(deliveryId).emit('locationUpdated', { lat, lng });

    // 2. Asynchronously save telemetry to MongoDB
    await this.trackingModel.updateOne(
      { deliveryId, riderId },
      { $push: { path: { lat, lng } } },
      { upsert: true },
    );
    
    // 3. TODO: Update Redis GEO set for dispatch algorithm
  }
}
