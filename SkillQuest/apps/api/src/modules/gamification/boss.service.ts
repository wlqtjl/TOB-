/**
 * Boss Service — Boss 关通关结算
 *
 * - 计算通关奖励 (段位积分 + 星星 + XP)
 * - 触发首次击败该 Boss 的成就
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RankService } from './rank.service';

export interface BossCompleteInput {
  levelId: string;
  userId: string;
  /** 正确率 (0~1) */
  accuracy: number;
  /** 剩余时间百分比 (0~1)，可选，用于 S 评级 */
  timeRemainingRatio?: number;
}

export interface BossCompleteResult {
  levelId: string;
  stars: number;
  rankDelta: number;
  xpDelta: number;
  grade: 'S' | 'A' | 'B' | 'C';
  promoted: boolean;
  newRank: string;
  previousRank: string;
  achievementUnlocked: boolean;
}

const BASE_RANK_REWARD = 150;
const BASE_XP_REWARD = 200;

@Injectable()
export class BossService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rank: RankService,
  ) {}

  async complete(input: BossCompleteInput): Promise<BossCompleteResult> {
    const level = await this.prisma.level.findUnique({
      where: { id: input.levelId },
      select: { id: true, title: true, isBoss: true },
    });
    if (!level) throw new NotFoundException(`关卡不存在: ${input.levelId}`);
    if (!level.isBoss) {
      throw new BadRequestException(`关卡 ${level.title} 不是 Boss 关`);
    }

    const accuracy = Math.max(0, Math.min(1, input.accuracy));
    const timeBonus = Math.max(0, Math.min(1, input.timeRemainingRatio ?? 0));

    // 评级: accuracy + timeBonus/3 作为综合得分
    const composite = accuracy + timeBonus / 3;
    const { grade, stars } = BossService.gradeFor(composite);

    const rankDelta = Math.round(BASE_RANK_REWARD * (0.5 + accuracy * 0.5 + timeBonus * 0.3));
    const xpDelta = Math.round(BASE_XP_REWARD * (0.5 + accuracy * 0.5));

    // 1) 更新段位积分
    const rankResult = await this.rank.addScore(input.userId, rankDelta);

    // 2) 累加 XP / 星星
    await this.prisma.user.update({
      where: { id: input.userId },
      data: {
        xp: { increment: xpDelta },
        totalStars: { increment: stars },
      },
    });

    // 3) 首次击败成就 — UserAchievement 以 name 为唯一键
    const achievementName = `首次击败: ${level.title}`;
    const existing = await this.prisma.userAchievement.findUnique({
      where: { userId_name: { userId: input.userId, name: achievementName } },
    });
    let achievementUnlocked = false;
    if (!existing) {
      await this.prisma.userAchievement.create({
        data: {
          userId: input.userId,
          name: achievementName,
          description: `成功通关 Boss 关卡《${level.title}》`,
          icon: '👑',
        },
      });
      achievementUnlocked = true;
    }

    return {
      levelId: level.id,
      stars,
      rankDelta,
      xpDelta,
      grade,
      promoted: rankResult.promoted,
      newRank: rankResult.rank,
      previousRank: rankResult.previousRank,
      achievementUnlocked,
    };
  }

  private static gradeFor(composite: number): { grade: 'S' | 'A' | 'B' | 'C'; stars: number } {
    if (composite >= 1.15) return { grade: 'S', stars: 3 };
    if (composite >= 0.9) return { grade: 'A', stars: 3 };
    if (composite >= 0.7) return { grade: 'B', stars: 2 };
    return { grade: 'C', stars: 1 };
  }
}
