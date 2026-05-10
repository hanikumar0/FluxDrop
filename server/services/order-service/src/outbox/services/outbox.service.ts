import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private client: any;

  constructor(private db: DatabaseService) {
    this.client = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: {
        host: 'balanced-honeybee-120021.upstash.io',
        port: 6379,
        password: 'gQAAAAAAAdTVAAIgcDI1ZDU0NWRlNThkZGM0ZWQyOTUzYWYxYTI3MWNhN2Q0Zg',
        tls: {},
      },
    });
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processOutbox() {
    const result = await this.db.query(
      'SELECT id, type, payload FROM "OutboxEvent" WHERE "isProcessed" = false LIMIT 10',
    );

    const events = result.rows;

    for (const event of events) {
      try {
        await this.client.emit(event.type, event.payload).toPromise();
        await this.db.query(
          'UPDATE "OutboxEvent" SET "isProcessed" = true WHERE id = $1',
          [event.id],
        );
        this.logger.log(`Processed outbox event: ${event.type} (${event.id})`);
      } catch (error) {
        this.logger.error(`Failed to process outbox event: ${event.id}`, error);
      }
    }
  }
}
