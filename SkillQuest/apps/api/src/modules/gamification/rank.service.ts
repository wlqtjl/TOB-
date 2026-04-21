/**
 * Rank Service — 段位积分与 7 级段位计算 (IRON → LEGEND)
 *
 * - 根据 rankScore 计算当前段位
 * - 支持通关加分 / 失败扣分
 * - 提供租户内段位排行榜
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PlayerRank } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

/** 段位阈值表 (rankScore 下限) — 与前端 RankBadge 保持一致 */
const RANK_THRESHOLDS: ReadonlyArray<{ rank: PlayerRank; min: number }> = [
  { rank: PlayerRank.LEGEND, min: 5000 },
  { rank: PlayerRank.DIAMOND, min: 3000 },
  { rank: PlayerRank.PLATINUM, min: 1800 },
  { rank: PlayerRank.GOLD, min: 1000 },
  { rank: PlayerRank.SILVER, min: 500 },
  { rank: PlayerRank.BRONZE, min: 200 },
  { rank: PlayerRank.IRON, min: 0 },
];

const RANK_ORDER: readonly PlayerRank[] = [
  PlayerRank.IRON,
  PlayerRank.BRONZE,
  PlayerRank.SILVER,
  PlayerRank.GOLD,
  PlayerRank.PLATINUM,
  PlayerRank.DIAMOND,
  PlayerRank.LEGEND,
];

export interface RankSummary {
  userId: string;
  displayName: string;
  avatarUrl: string;
  rank: PlayerRank;
  rankScore: number;
  /** 距离下一段位的积分差距 (已达最高段时为 null) */
  nextRank: PlayerRank | null;
  toNext: number | null;
}

@Injectable()
export class RankService {
  constructor(private readonly prisma: PrismaService) {}

  /** 由 rankScore 计算段位 */
  static computeRank(rankScore: number): PlayerRank {
    for (const { rank, min } of RANK_THRESHOLDS) {
      if (rankScore >= min) return rank;
    }
    return PlayerRank.IRON;
  }

  /** 获取比指定段位高一级的段位 (最高段返回 null) */
  static nextRankOf(current: PlayerRank): PlayerRank | null {
    const idx = RANK_ORDER.indexOf(current);
    if (idx < 0 || idx >= RANK_ORDER.length - 1) return null;
    return RANK_ORDER[idx + 1];
  }

  private static buildSummary(u: {
    id: string;
    displayName: string;
    avatarUrl: string;
    rank: PlayerRank;
    rankScore: number;
  }): RankSummary {
    const nextRank = RankService.nextRankOf(u.rank);
    const threshold = nextRank
      ? RANK_THRESHOLDS.find((r) => r.rank === nextRank)?.min ?? 0
      : null;
    const toNext = threshold !== null ? Math.max(0, threshold - u.rankScore) : null;
    return {
      userId: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      rank: u.rank,
      rankScore: u.rankScore,
      nextRank,
      toNext,
    };
  }

  /** 获取用户当前段位摘要 */
  async getSummary(userId: string): Promise<RankSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        rank: true,
        rankScore: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`用户不存在: ${userId}`);
    }
    return RankService.buildSummary(user);
  }

  /**
   * 为用户增加段位积分并同步段位。
   * delta 可为负数（掉分）。返回升/降段信息。
   */
  async addScore(
    userId: string,
    delta: number,
  ): Promise<{
    rankScore: number;
    rank: PlayerRank;
    previousRank: PlayerRank;
    promoted: boolean;
  }> {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { rankScore: true, rank: true },
    });
    if (!current) {
      throw new NotFoundException(`用户不存在: ${userId}`);
    }

    const newScore = Math.max(0, current.rankScore + delta);
    const newRank = RankService.computeRank(newScore);

    await this.prisma.user.update({
      where: { id: userId },
      data: { rankScore: newScore, rank: newRank },
    });

    const promoted =
      RANK_ORDER.indexOf(newRank) > RANK_ORDER.indexOf(current.rank);

    return {
      rankScore: newScore,
      rank: newRank,
      previousRank: current.rank,
      promoted,
    };
  }

  /** 租户内段位排行榜 (按 rankScore 降序) */
  async getLeaderboard(tenantId: string, limit = 50): Promise<RankSummary[]> {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      orderBy: [{ rankScore: 'desc' }, { totalStars: 'desc' }],
      take: limit,
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        rank: true,
        rankScore: true,
      },
    });
    return users.map((u) => RankService.buildSummary(u));
  }
}
