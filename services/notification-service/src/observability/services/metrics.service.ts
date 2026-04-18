import { Injectable } from '@nestjs/common';
import { Registry, Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;
  public readonly notificationsSentCounter: Counter<string>;
  public readonly httpRequestDuration: Histogram<string>;

  constructor() {
    this.registry = new Registry();

    this.notificationsSentCounter = new Counter({
      name: 'notifications_sent_total',
      help: 'Total number of notifications sent',
      labelNames: ['type', 'status'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.registry.registerMetric(this.notificationsSentCounter);
    this.registry.registerMetric(this.httpRequestDuration);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
