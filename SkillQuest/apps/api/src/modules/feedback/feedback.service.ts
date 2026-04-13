/**
 * Feedback Service — 学员反馈收集 + 质量指标
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  /** 提交反馈 (upsert) */
  async submitFeedback(data: {
    userId: string;
    levelId: string;
    difficultyRating?: number;
    clarityRating?: number;
    relevanceRating?: number;
    feedbackText?: string;
    tag?: string;
  }) {
    return this.prisma.levelFeedback.upsert({
      where: { userId_levelId: { userId: data.userId, levelId: data.levelId } },
      update: {
        difficultyRating: data.difficultyRating ?? 3,
        clarityRating: data.clarityRating ?? 3,
        relevanceRating: data.relevanceRating ?? 3,
        feedbackText: data.feedbackText ?? '',
        tag: data.tag ?? '',
      },
      create: {
        userId: data.userId,
        levelId: data.levelId,
        difficultyRating: data.difficultyRating ?? 3,
        clarityRating: data.clarityRating ?? 3,
        relevanceRating: data.relevanceRating ?? 3,
        feedbackText: data.feedbackText ?? '',
        tag: data.tag ?? '',
      },
    });
  }

  /** 获取关卡反馈列表 */
  async getLevelFeedback(levelId: string) {
    return this.prisma.levelFeedback.findMany({
      where: { levelId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 获取关卡质量指标 */
  async getLevelQualityMetrics(levelId: string) {
    const feedbacks = await this.prisma.levelFeedback.findMany({ where: { levelId } });
    const progressData = await this.prisma.userProgress.findMany({ where: { levelId } });

    const count = feedbacks.length;
    if (count === 0) {
      return { levelId, avgDifficulty: 0, avgClarity: 0, avgRelevance: 0, passRate: 0, avgAttempts: 0, feedbackCount: 0, needsRevision: false };
    }

    const avgDiff = feedbacks.reduce((s, f) => s + f.difficultyRating, 0) / count;
    const avgClarity = feedbacks.reduce((s, f) => s + f.clarityRating, 0) / count;
    const avgRelevance = feedbacks.reduce((s, f) => s + f.relevanceRating, 0) / count;

    const total = progressData.length;
    const passed = progressData.filter((p) => p.status === 'PASSED').length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const avgAttempts = total > 0 ? Math.round(progressData.reduce((s, p) => s + p.attempts, 0) / total) : 0;

    const negativeCount = feedbacks.filter((f) => f.tag === 'too_hard' || f.tag === 'unclear' || f.tag === 'bug').length;
    const needsRevision = count >= 5 && negativeCount / count >= 0.2;

    return { levelId, avgDifficulty: Math.round(avgDiff * 10) / 10, avgClarity: Math.round(avgClarity * 10) / 10, avgRelevance: Math.round(avgRelevance * 10) / 10, passRate, avgAttempts, feedbackCount: count, needsRevision };
  }

  /** 获取待审核课程队列 */
  async getReviewQueue(tenantId?: string) {
    const where = tenantId ? { course: { tenantId } } : {};
    const levels = await this.prisma.level.findMany({
      where,
      include: { feedbacks: true, course: { select: { title: true, tenantId: true } } },
    });

    return levels
      .filter((l) => {
        const count = l.feedbacks.length;
        if (count < 5) return false;
        const negative = l.feedbacks.filter((f) => f.tag === 'too_hard' || f.tag === 'unclear' || f.tag === 'bug').length;
        return negative / count >= 0.2;
      })
      .map((l) => ({
        levelId: l.id,
        levelTitle: l.title,
        courseTitle: l.course.title,
        feedbackCount: l.feedbacks.length,
        negativePercent: Math.round((l.feedbacks.filter((f) => f.tag === 'too_hard' || f.tag === 'unclear' || f.tag === 'bug').length / l.feedbacks.length) * 100),
      }));
  }
}
