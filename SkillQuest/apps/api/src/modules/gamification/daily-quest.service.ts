/**
 * Daily Quest Service — 每日任务
 *
 * - 每位用户每天自动生成一份任务（3 道题，从租户内已发布课程随机抽取）
 * - 提交完成后记录星数，并触发段位加分
 */

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { RankService } from './rank.service';

const DAILY_QUESTION_COUNT = 3;
/** 完成每日任务的段位积分奖励 */
const DAILY_QUEST_RANK_BONUS = 30;

export interface DailyQuestQuestion {
  levelId: string;
  title: string;
  courseId: string;
  courseTitle: string;
}

/** 本地日期字符串 (YYYY-MM-DD) — 以服务器时区为准 */
function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Injectable()
export class DailyQuestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rank: RankService,
  ) {}

  /**
   * 获取用户当天的每日任务，不存在则自动生成。
   */
  async getToday(userId: string, tenantId: string) {
    const date = todayStr();
    const existing = await this.prisma.dailyQuest.findUnique({
      where: { userId_date: { userId, date } },
    });
    if (existing) return existing;

    const questions = await this.pickQuestions(tenantId);
    return this.prisma.dailyQuest.create({
      data: {
        userId,
        tenantId,
        date,
        questions: questions as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * 标记每日任务完成，记录星数并发放段位积分。
   */
  async complete(
    questId: string,
    userId: string,
    stars: number,
  ) {
    const quest = await this.prisma.dailyQuest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException(`每日任务不存在: ${questId}`);
    if (quest.userId !== userId) {
      throw new ForbiddenException('不能完成他人的每日任务');
    }
    if (quest.completed) return quest;

    const clampedStars = Math.max(0, Math.min(3, Math.round(stars)));
    const updated = await this.prisma.dailyQuest.update({
      where: { id: questId },
      data: {
        completed: true,
        completedAt: new Date(),
        stars: clampedStars,
      },
    });

    if (clampedStars > 0) {
      await this.rank.addScore(userId, DAILY_QUEST_RANK_BONUS + clampedStars * 5);
    }

    return updated;
  }

  /**
   * 从租户内已发布课程中挑选若干关卡作为当日题目。
   * 若关卡不足则返回实际数量（不报错，便于新租户尝鲜）。
   */
  private async pickQuestions(tenantId: string): Promise<DailyQuestQuestion[]> {
    const levels = await this.prisma.level.findMany({
      where: {
        course: {
          tenantId,
          pipelineStatus: 'PUBLISHED',
        },
        reviewStatus: 'APPROVED',
      },
      select: {
        id: true,
        title: true,
        courseId: true,
        course: { select: { title: true } },
      },
      take: 200,
    });

    // 简单随机抽样 — 无需密码学强度
    const shuffled = [...levels].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, DAILY_QUESTION_COUNT).map((l) => ({
      levelId: l.id,
      title: l.title,
      courseId: l.courseId,
      courseTitle: l.course.title,
    }));
  }
}
