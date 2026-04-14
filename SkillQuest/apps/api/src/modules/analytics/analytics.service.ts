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

    // 收集所有 levelId — 单次批量查询替代 N+1
    const allLevelIds = courses.flatMap((c) => c.levels.map((l: { id: string }) => l.id));
    const courseLevelMap = new Map(
      courses.map((c) => [c.id, c.levels.map((l: { id: string }) => l.id)]),
    );

    // 3 次批量聚合 + 按 levelId 分组
    const [attemptsByLevel, scoresByLevel, passedByLevel] = await Promise.all([
      this.prisma.score.groupBy({
        by: ['levelId'],
        where: { levelId: { in: allLevelIds } },
        _count: true,
      }),
      this.prisma.score.groupBy({
        by: ['levelId'],
        where: { levelId: { in: allLevelIds } },
        _avg: { totalScore: true },
        _sum: { totalScore: true },
        _count: true,
      }),
      this.prisma.userProgress.groupBy({
        by: ['levelId'],
        where: { levelId: { in: allLevelIds }, status: 'PASSED' },
        _count: true,
      }),
    ]);

    const attemptMap = new Map(attemptsByLevel.map((a) => [a.levelId, a._count]));
    const scoreMap = new Map(
      scoresByLevel.map((s) => [s.levelId, { sum: s._sum.totalScore ?? 0, count: s._count }]),
    );
    const passedMap = new Map(passedByLevel.map((p) => [p.levelId, p._count]));

    return courses.map((course) => {
      const levelIds = courseLevelMap.get(course.id) ?? [];
      const levelCount = levelIds.length;

      let totalAttempts = 0;
      let totalScoreSum = 0;
      let totalScoreCount = 0;
      let passedCount = 0;

      for (const lid of levelIds) {
        totalAttempts += attemptMap.get(lid) ?? 0;
        const sc = scoreMap.get(lid);
        if (sc) {
          totalScoreSum += sc.sum;
          totalScoreCount += sc.count;
        }
        passedCount += passedMap.get(lid) ?? 0;
      }

      return {
        id: course.id,
        title: course.title,
        vendor: course.vendor,
        category: course.category,
        levelCount,
        totalAttempts,
        averageScore: totalScoreCount > 0 ? Math.round(totalScoreSum / totalScoreCount) : 0,
        passedCount,
        completionRate: levelCount > 0 ? Math.round((passedCount / levelCount) * 100) : 0,
      };
    });
  }
