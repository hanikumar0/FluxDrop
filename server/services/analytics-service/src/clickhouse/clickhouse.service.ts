import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, ClickHouseClient } from '@clickhouse/client';

@Injectable()
export class ClickHouseService implements OnModuleInit {
  private client!: ClickHouseClient;

  onModuleInit() {
    this.client = createClient({
      host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: 'fluxdrop_analytics',
    });
  }

  async insertOrderEvent(event: any) {
    await this.client.insert({
      table: 'orders_fact',
      values: [event],
      format: 'JSONEachRow',
    });
  }

  async query(query: string) {
    const resultSet = await this.client.query({
      query,
      format: 'JSONEachRow',
    });
    return resultSet.json();
  }
}
