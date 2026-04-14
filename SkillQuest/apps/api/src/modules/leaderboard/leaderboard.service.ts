/**
 * Leaderboard Service — Redis (优先) / 数据库 排行榜
 *
 * Redis 不可用时自动降级为 PostgreSQL 查询。
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import Redis from 'ioredis';
import type { LeaderboardEntry } from '@skillquest/types';

@Injectable()
export class LeaderboardService implements OnModuleDestroy {
  private readonly logger = new Logger(LeaderboardService.name);
  private redis: Redis | null = null;

  constructor(private readonly prisma: PrismaService) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        const redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 200, 5000),
          lazyConnect: true,
          enableReadyCheck: true,
        });
        redis.on('error', (err) => {
          this.logger.warn(`Redis 连接错误: ${err.message}`);
        });
        redis.on('reconnecting', () => {
          this.logger.log('Redis 正在重连...');
        });
        redis.connect().then(() => {
          this.redis = redis;
          this.logger.log('Redis 连接成功');
        }).catch((err) => {
          this.logger.warn(`Redis 不可用，降级为数据库排行榜: ${(err as Error).message}`);
          redis.disconnect().catch(() => {});
        });
      } catch {
        this.logger.warn('Redis 初始化失败，降级为数据库排行榜');
      }
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      try {
        await this.redis.quit();
        this.logger.log('Redis 连接已关闭');
      } catch {
        this.redis.disconnect();
      }
      this.redis = null;
    }
  }

  /** 获取课程排行榜 */
  async getLeaderboard(courseId: string, limit = 20): Promise<LeaderboardEntry[]> {
    if (this.redis) {
      try {
        return await this.getFromRedis(courseId, limit);
      } catch (err) {
        this.logger.warn(`Redis 查询失败，降级到数据库: ${(err as Error).message}`);
      }
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

    // 批量收集 userId
    const userIds: string[] = [];
    for (let i = 0; i < members.length; i += 2) {
      userIds.push(members[i]);
    }
    if (userIds.length === 0) return [];

    // 单次批量查询（修复 N+1）
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, avatarUrl: true, totalStars: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < members.length; i += 2) {
      const userId = members[i];
      const totalScore = parseInt(members[i + 1], 10);
      const user = userMap.get(userId);

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

    if (scores.length === 0) return [];

    // 批量查询用户信息（修复 N+1）
    const userIds = scores.map((s) => s.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, avatarUrl: true, totalStars: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < scores.length; i++) {
      const { userId, _sum } = scores[i];
      const user = userMap.get(userId);
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
