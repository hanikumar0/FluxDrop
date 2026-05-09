import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ClickHouseService } from '../clickhouse/clickhouse.service';

@Injectable()
export class RedisAnalyticsConsumer implements OnModuleInit {
  private redis: Redis;

  constructor(private clickHouseService: ClickHouseService) {
    this.redis = new Redis("rediss://default:gQAAAAAAAdTVAAIgcDI1ZDU0NWRlNThkZGM0ZWQyOTUzYWYxYTI3MWNhN2Q0Zg@balanced-honeybee-120021.upstash.io:6379");
  }

  async onModuleInit() {
    // Subscribe to multiple event channels
    await this.redis.subscribe('order.created', 'payment.confirmed');

    this.redis.on('message', async (channel, message) => {
      try {
        const payload = JSON.parse(message);
        
        console.log(`Received event from channel ${channel}:`, payload.orderId);

        const enrichedEvent = {
          ...payload,
          processed_at: new Date().toISOString(),
          channel,
          source: 'upstash-redis',
        };

        await this.clickHouseService.insertOrderEvent(enrichedEvent);
      } catch (error) {
        console.error('Failed to process analytics event:', error);
      }
    });
  }
}
