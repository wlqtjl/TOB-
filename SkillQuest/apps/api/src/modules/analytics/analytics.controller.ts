/**
 * Analytics Controller — 事件跟踪 + 统计数据 API + CSV 导出
 */

import { Controller, Get, Post, Param, Query, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
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

  /** CSV导出 — 课程统计报表 */
  @Get('export/courses')
  async exportCoursesCsv(
    @Query('tenantId') tenantId: string | undefined,
    @Res() res: Response,
  ) {
    const report = await this.analytics.getCourseReport(tenantId);
    const bom = '\uFEFF';
    const headers = ['Course', 'Vendor', 'Category', 'Levels', 'Attempts', 'Avg Score', 'Passed', 'Completion Rate'];
    const rows = report.map((r) => [
      r.title, r.vendor, r.category, String(r.levelCount),
      String(r.totalAttempts), String(r.averageScore), String(r.passedCount),
      `${r.completionRate}%`,
    ].map((c) => `"${c.replace(/"/g, '""')}"`).join(','));

    const csv = bom + [headers.join(','), ...rows].join('\n');
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="skillquest-report-${date}.csv"`);
    res.send(csv);
  }
}
