import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private client: any;

  constructor(private prisma: PrismaService) {
    this.client = ClientProxyFactory.create({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'order-service',
          brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
        },
        consumer: {
          groupId: 'order-consumer',
        },
      },
    });
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processOutbox() {
    const events = await this.prisma.outboxEvent.findMany({
      where: { isProcessed: false },
      take: 10,
    });

    for (const event of events) {
      try {
        await this.client.emit(event.type, event.payload).toPromise();
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { isProcessed: true },
        });
        this.logger.log(`Processed outbox event: ${event.type} (${event.id})`);
      } catch (error) {
        this.logger.error(`Failed to process outbox event: ${event.id}`, error);
      }
    }
  }
}
