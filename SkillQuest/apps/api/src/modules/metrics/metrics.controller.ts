import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Public()
  async getMetrics(@Res() res: Response) {
    const metricsData = await this.metrics.getMetrics();
    res.set('Content-Type', this.metrics.getContentType());
    res.end(metricsData);
  }
}
