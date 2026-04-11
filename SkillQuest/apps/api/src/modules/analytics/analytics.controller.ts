/**
 * Analytics Controller — 事件跟踪 + 统计数据 API
 */

import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** 记录事件 */
  @Post('events')
  trackEvent(@Body() body: { userId: string; event: string; payload?: Record<string, unknown> }) {
    return this.analytics.trackEvent(body.userId, body.event, body.payload);
  }

  /** 用户学习概览 */
  @Get('users/:userId')
  getUserSummary(@Param('userId') userId: string) {
    return this.analytics.getUserSummary(userId);
  }

  /** 课程统计 */
  @Get('courses/:courseId')
  getCourseSummary(@Param('courseId') courseId: string) {
    return this.analytics.getCourseSummary(courseId);
  }

  /** 每日活跃统计 */
  @Get('daily')
  getDailyActivity(@Query('days') days?: string) {
    return this.analytics.getDailyActivity(days ? parseInt(days, 10) : 30);
  }
}
