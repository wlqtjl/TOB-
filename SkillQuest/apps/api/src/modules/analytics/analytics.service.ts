/**
 * Analytics Service — 事件记录 + 统计查询
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

type GroupByCount<K extends string> = { [P in K]: string } & { _count: number };

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 记录分析事件 */
  async trackEvent(userId: string, event: string, payload?: Record<string, unknown>) {
    return this.prisma.analyticsEvent.create({
      data: {
        userId,
        event,
        payload: (payload ?? {}) as object,
      },
    });
  }

  /** 获取用户学习概览 */
  async getUserSummary(userId: string) {
    const [totalScores, totalProgress, recentEvents] = await Promise.all([
      this.prisma.score.aggregate({
        where: { userId },
        _sum: { totalScore: true },
        _count: true,
      }),
      this.prisma.userProgress.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      this.prisma.analyticsEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      totalScore: totalScores._sum.totalScore ?? 0,
      totalAttempts: totalScores._count,
      progressByStatus: totalProgress.reduce(
        (acc: Record<string, number>, p: GroupByCount<'status'>) => ({ ...acc, [p.status]: p._count }),
        {} as Record<string, number>,
      ),
      recentEvents,
    };
  }

  /** 获取课程统计 */
  async getCourseSummary(courseId: string) {
    const [totalAttempts, avgScore, completionRate] = await Promise.all([
      this.prisma.score.count({ where: { level: { courseId } } }),
      this.prisma.score.aggregate({
        where: { level: { courseId } },
        _avg: { totalScore: true },
      }),
      this.prisma.userProgress.groupBy({
        by: ['status'],
        where: { level: { courseId } },
        _count: true,
      }),
    ]);

    return {
      totalAttempts,
      averageScore: Math.round(avgScore._avg.totalScore ?? 0),
      completionByStatus: completionRate.reduce(
        (acc: Record<string, number>, p: GroupByCount<'status'>) => ({ ...acc, [p.status]: p._count }),
        {} as Record<string, number>,
      ),
    };
  }

  /** 获取每日活跃统计 */
  async getDailyActivity(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await this.prisma.analyticsEvent.groupBy({
      by: ['event'],
      where: { createdAt: { gte: since } },
      _count: true,
    });

    return {
      period: `${days}d`,
      since: since.toISOString(),
      eventCounts: events.reduce(
        (acc: Record<string, number>, e: GroupByCount<'event'>) => ({ ...acc, [e.event]: e._count }),
        {} as Record<string, number>,
      ),
    };
  }

  /** 获取课程统计报表 (用于 CSV 导出) */
  async getCourseReport(tenantId?: string) {
    const where = tenantId ? { tenantId } : {};
    const courses = await this.prisma.course.findMany({
      where,
      include: {
        levels: {
          select: { id: true },
        },
      },
    });

    const report = [];
    for (const course of courses) {
      const levelIds = course.levels.map((l: { id: string }) => l.id);
      const levelCount = levelIds.length;

      const [totalAttempts, avgScore, passedCount] = await Promise.all([
        this.prisma.score.count({ where: { levelId: { in: levelIds } } }),
        this.prisma.score.aggregate({
          where: { levelId: { in: levelIds } },
          _avg: { totalScore: true },
        }),
        this.prisma.userProgress.count({
          where: { levelId: { in: levelIds }, status: 'PASSED' },
        }),
      ]);

      report.push({
        id: course.id,
        title: course.title,
        vendor: course.vendor,
        category: course.category,
        levelCount,
        totalAttempts,
        averageScore: Math.round(avgScore._avg.totalScore ?? 0),
        passedCount,
        completionRate: levelCount > 0 ? Math.round((passedCount / levelCount) * 100) : 0,
      });
    }

    return report;
  }
}
