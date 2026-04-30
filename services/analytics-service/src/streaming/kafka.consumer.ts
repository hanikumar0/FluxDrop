import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer, EachMessageHandler } from 'kafkajs';
import { ClickHouseService } from '../clickhouse/clickhouse.service';

@Injectable()
export class KafkaAnalyticsConsumer implements OnModuleInit {
  private kafka = new Kafka({
    clientId: 'analytics-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  });

  private consumer: Consumer = this.kafka.consumer({ groupId: 'analytics-group' });

  constructor(private clickHouseService: ClickHouseService) {}

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topics: ['orders.v1', 'payments.v1'], fromBeginning: false });

    await this.consumer.run({
      eachMessage: (async ({ topic, partition, message }) => {
        if (!message.value) return;
        
        const payload = JSON.parse(message.value.toString());
        
        console.log(`Received event from ${topic}:`, payload.orderId);

        const enrichedEvent = {
          ...payload,
          processed_at: new Date().toISOString(),
          topic,
          partition,
          offset: message.offset,
        };

        await this.clickHouseService.insertOrderEvent(enrichedEvent);
      }) as EachMessageHandler,
    });
  }
}
