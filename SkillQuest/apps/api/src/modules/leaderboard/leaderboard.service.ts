/**
 * Leaderboard Service — Redis (优先) / 数据库 排行榜
 *
 * Redis 不可用时自动降级为 PostgreSQL 查询。
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import Redis from 'ioredis';
import type { LeaderboardEntry } from '@skillquest/types';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);
  private redis: Redis | null = null;

  constructor(private readonly prisma: PrismaService) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
        this.redis.connect().catch((err) => {
          this.logger.warn(`Redis 不可用，降级为数据库排行榜: ${(err as Error).message}`);
          this.redis = null;
        });
      } catch {
        this.logger.warn('Redis 初始化失败，降级为数据库排行榜');
        this.redis = null;
      }
    }
  }

  /** 获取课程排行榜 */
  async getLeaderboard(courseId: string, limit = 20): Promise<LeaderboardEntry[]> {
    if (this.redis) {
      return this.getFromRedis(courseId, limit);
    }
    return this.getFromDatabase(courseId, limit);
  }

  /** 提交/更新分数 */
  async submitScore(courseId: string, userId: string, score: number): Promise<void> {
    if (this.redis) {
      const key = `leaderboard:${courseId}`;
      await this.redis.zincrby(key, score, userId);
    }
  }

  /** 获取用户排名 */
  async getUserRank(courseId: string, userId: string): Promise<number | null> {
    if (this.redis) {
      const rank = await this.redis.zrevrank(`leaderboard:${courseId}`, userId);
      return rank !== null ? rank + 1 : null;
    }
    return null;
  }

  // ─── Redis 实现 ────────────────────────────────────────────────

  private async getFromRedis(courseId: string, limit: number): Promise<LeaderboardEntry[]> {
    const key = `leaderboard:${courseId}`;
    const members = await this.redis!.zrevrange(key, 0, limit - 1, 'WITHSCORES');

    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < members.length; i += 2) {
      const userId = members[i];
      const totalScore = parseInt(members[i + 1], 10);

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, avatarUrl: true, totalStars: true },
      });

      entries.push({
        userId,
        displayName: user?.displayName ?? '未知用户',
        avatarUrl: user?.avatarUrl ?? '',
        totalScore,
        rank: Math.floor(i / 2) + 1,
        rankChange: 0,
        stars: user?.totalStars ?? 0,
        streakDays: 0,
      });
    }
    return entries;
  }

  // ─── 数据库降级实现 ────────────────────────────────────────────

  private async getFromDatabase(courseId: string, limit: number): Promise<LeaderboardEntry[]> {
    // Aggregate scores per user for this course
    const scores = await this.prisma.score.groupBy({
      by: ['userId'],
      where: { level: { courseId } },
      _sum: { totalScore: true },
      orderBy: { _sum: { totalScore: 'desc' } },
      take: limit,
    });

    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < scores.length; i++) {
      const { userId, _sum } = scores[i];
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, avatarUrl: true, totalStars: true },
      });
      entries.push({
        userId,
        displayName: user?.displayName ?? '未知用户',
        avatarUrl: user?.avatarUrl ?? '',
        totalScore: _sum.totalScore ?? 0,
        rank: i + 1,
        rankChange: 0,
        stars: user?.totalStars ?? 0,
        streakDays: 0,
      });
    }
    return entries;
  }
}
