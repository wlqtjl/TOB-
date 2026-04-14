/**
 * Prometheus Metrics Module
 *
 * 基于 prom-client 提供 /metrics 端点。
 * 安装: pnpm --filter @skillquest/api add prom-client
 */
import { Module, OnModuleInit } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule implements OnModuleInit {
  constructor(private readonly metrics: MetricsService) {}

  onModuleInit() {
    this.metrics.initDefaultMetrics();
  }
}
