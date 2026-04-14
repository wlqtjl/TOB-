/**
 * Analytics Module — 学习数据分析 + 事件跟踪
 */

import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  providers: [AnalyticsService, PrismaService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
