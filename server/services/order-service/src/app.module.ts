import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrdersModule } from './orders/orders.module';
import { OutboxModule } from './outbox/outbox.module';
import { DatabaseService } from './database/database.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    OrdersModule,
    OutboxModule,
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class AppModule {}
