/**
 * Badge Service — 徽章解锁 + 玩家等级计算
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

const DEFAULT_BADGES = [
  { key: 'first_clear', name: 'First Clear', description: 'Complete your first level', icon: 'shield', category: 'PROGRESS' as const, rarity: 'COMMON' as const, condition: { type: 'level_clear_count', threshold: 1 }, xpReward: 50 },
  { key: 'five_clears', name: 'Five Clears', description: 'Complete 5 levels', icon: 'target', category: 'PROGRESS' as const, rarity: 'UNCOMMON' as const, condition: { type: 'level_clear_count', threshold: 5 }, xpReward: 100 },
  { key: 'ten_clears', name: 'Dedicated Learner', description: 'Complete 10 levels', icon: 'book-open', category: 'PROGRESS' as const, rarity: 'RARE' as const, condition: { type: 'level_clear_count', threshold: 10 }, xpReward: 200 },
  { key: 'perfect_score', name: 'Perfect Score', description: 'Score 100% on a level', icon: 'sparkles', category: 'MASTERY' as const, rarity: 'UNCOMMON' as const, condition: { type: 'perfect_score_count', threshold: 1 }, xpReward: 150 },
  { key: 'triple_perfect', name: 'Triple Perfect', description: 'Score 100% on 3 levels', icon: 'crown', category: 'MASTERY' as const, rarity: 'RARE' as const, condition: { type: 'perfect_score_count', threshold: 3 }, xpReward: 300 },
  { key: 'streak_3', name: '3-Day Streak', description: 'Study 3 days in a row', icon: 'flame', category: 'STREAK' as const, rarity: 'COMMON' as const, condition: { type: 'streak_days', threshold: 3 }, xpReward: 50 },
  { key: 'streak_7', name: 'Weekly Warrior', description: 'Study 7 days in a row', icon: 'zap', category: 'STREAK' as const, rarity: 'UNCOMMON' as const, condition: { type: 'streak_days', threshold: 7 }, xpReward: 150 },
  { key: 'streak_30', name: 'Monthly Master', description: 'Study 30 days in a row', icon: 'award', category: 'STREAK' as const, rarity: 'EPIC' as const, condition: { type: 'streak_days', threshold: 30 }, xpReward: 500 },
  { key: 'xp_1000', name: 'XP Hunter', description: 'Earn 1000 total XP', icon: 'trending-up', category: 'MASTERY' as const, rarity: 'RARE' as const, condition: { type: 'total_xp', threshold: 1000 }, xpReward: 200 },
  { key: 'star_50', name: 'Star Collector', description: 'Collect 50 stars', icon: 'star', category: 'MASTERY' as const, rarity: 'EPIC' as const, condition: { type: 'star_count', threshold: 50 }, xpReward: 400 },
];

interface BadgeCondition {
  type: string;
  threshold: number;
}

@Injectable()
export class BadgeService {
  constructor(private readonly prisma: PrismaService) {}

  /** 获取所有徽章定义 */
  async getAllBadges() {
    return this.prisma.badgeDefinition.findMany({ orderBy: { createdAt: 'asc' } });
  }

  /** 获取用户已获得的徽章 */
  async getUserBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  /** 检查并授予徽章 */
  async checkAndAwardBadges(userId: string) {
    const [user, passedCount, perfectCount, existingBadges, allBadges] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { xp: true, totalStars: true } }),
      this.prisma.userProgress.count({ where: { userId, status: 'PASSED' } }),
      this.prisma.score.count({ where: { userId, stars: 3 } }),
      this.prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
      this.prisma.badgeDefinition.findMany(),
    ]);

    if (!user) return [];

    const earnedIds = new Set(existingBadges.map((b) => b.badgeId));
    const newBadges = [];

    for (const badge of allBadges) {
      if (earnedIds.has(badge.id)) continue;
      const cond = badge.condition as BadgeCondition;
      let earned = false;

      switch (cond.type) {
        case 'level_clear_count': earned = passedCount >= cond.threshold; break;
        case 'perfect_score_count': earned = perfectCount >= cond.threshold; break;
        case 'total_xp': earned = user.xp >= cond.threshold; break;
        case 'star_count': earned = user.totalStars >= cond.threshold; break;
      }

      if (earned) {
        const ub = await this.prisma.userBadge.create({
          data: { userId, badgeId: badge.id },
          include: { badge: true },
        });
        newBadges.push(ub);
      }
    }

    return newBadges;
  }

  /** 计算玩家等级 */
  async getPlayerLevel(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
    if (!user) return { currentLevel: 0, currentXp: 0, nextLevelXp: 100, title: 'Newcomer', progressPercent: 0 };

    const levels = await this.prisma.playerLevel.findMany({ orderBy: { xpRequired: 'asc' } });
    let currentLevel = { level: 0, title: 'Newcomer', xpRequired: 0 };
    let nextLevelXp = 100;

    for (let i = 0; i < levels.length; i++) {
      if (user.xp >= levels[i].xpRequired) {
        currentLevel = levels[i];
        nextLevelXp = levels[i + 1]?.xpRequired ?? levels[i].xpRequired + 500;
      }
    }

    const range = nextLevelXp - currentLevel.xpRequired;
    const progress = range > 0 ? Math.min(100, Math.round(((user.xp - currentLevel.xpRequired) / range) * 100)) : 100;

    return {
      currentLevel: currentLevel.level,
      currentXp: user.xp,
      nextLevelXp,
      title: currentLevel.title,
      progressPercent: progress,
    };
  }

  /** 初始化默认徽章 */
  async seedDefaultBadges() {
    const results = [];
    for (const b of DEFAULT_BADGES) {
      const badge = await this.prisma.badgeDefinition.upsert({
        where: { key: b.key },
        update: { name: b.name, description: b.description },
        create: {
          key: b.key,
          name: b.name,
          description: b.description,
          icon: b.icon,
          category: b.category,
          rarity: b.rarity,
          condition: b.condition as object,
          xpReward: b.xpReward,
        },
      });
      results.push(badge);
    }
    return results;
  }
}
