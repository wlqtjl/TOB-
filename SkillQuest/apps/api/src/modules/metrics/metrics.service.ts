import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly register: client.Registry;

  readonly httpRequestDuration: client.Histogram;
  readonly httpRequestTotal: client.Counter;
  readonly activeConnections: client.Gauge;

  constructor() {
    this.register = new client.Registry();

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    this.httpRequestTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.activeConnections = new client.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.register],
    });
  }

  initDefaultMetrics() {
    client.collectDefaultMetrics({ register: this.register });
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }
}
