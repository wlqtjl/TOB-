/**
 * 评分引擎 — 对标 Data Center 的 XP + money + reputation 三维度
 *
 * baseScore  = 答对题目基础分
 * timeBonus  = 限时完成奖励 (剩余时间/总时间 × 基础分 × 0.5)
 * comboBonus = 连续答对加成 (combo × 10)
 * stars      = 综合评级 (1-3星)
 * xpGained   = 总分 × XP倍率
 */

import type { ScoreResult, Achievement } from '@skillquest/types';

export interface ScoringInput {
  correctCount: number;
  totalCount: number;
  /** 剩余时间(秒), -1 表示不限时 */
  timeRemainingSec: number;
  /** 总时间(秒) */
  timeLimitSec: number;
  /** 当前连击数 */
  maxCombo: number;
  /** XP 倍率 (默认 1.0) */
  xpMultiplier?: number;
}

/** 星级阈值配置 */
const STAR_THRESHOLDS = {
  three: 0.95, // ≥95% → 3星
  two: 0.80,   // ≥80% → 2星
  one: 0.60,   // ≥60% → 1星 (通关)
};

/** 每道题基础分 */
const BASE_POINTS_PER_QUESTION = 100;

export class ScoringEngine {
  /**
   * 计算关卡得分
   */
  static calculate(input: ScoringInput): ScoreResult {
    const {
      correctCount,
      totalCount,
      timeRemainingSec,
      timeLimitSec,
      maxCombo,
      xpMultiplier = 1.0,
    } = input;

    // 基础分
    const baseScore = correctCount * BASE_POINTS_PER_QUESTION;

    // 时间奖励: 只在限时模式下生效
    let timeBonus = 0;
    if (timeLimitSec > 0 && timeRemainingSec > 0) {
      const timeRatio = timeRemainingSec / timeLimitSec;
      timeBonus = Math.round(baseScore * timeRatio * 0.5);
    }

    // 连击奖励: combo × 10 (最高不超过基础分的 50%)
    const rawComboBonus = maxCombo * 10;
    const comboBonus = Math.min(rawComboBonus, Math.round(baseScore * 0.5));

    // 总分
    const totalScore = baseScore + timeBonus + comboBonus;

    // 星级
    const accuracy = totalCount > 0 ? correctCount / totalCount : 0;
    let stars: 0 | 1 | 2 | 3;
    if (accuracy >= STAR_THRESHOLDS.three) {
      stars = 3;
    } else if (accuracy >= STAR_THRESHOLDS.two) {
      stars = 2;
    } else if (accuracy >= STAR_THRESHOLDS.one) {
      stars = 1;
    } else {
      stars = 0;
    }

    // XP
    const xpGained = Math.round(totalScore * xpMultiplier * 0.1);

    // 成就检测
    const achievements: Achievement[] = [];
    if (accuracy === 1.0) {
      achievements.push({
        id: 'perfect_score',
        name: '完美通关',
        description: '全部答对，零失误！',
        icon: '🏆',
        unlockedAt: new Date().toISOString(),
      });
    }
    if (maxCombo >= 10) {
      achievements.push({
        id: 'combo_master',
        name: '连击大师',
        description: `达成 ${maxCombo} 连击！`,
        icon: '🔥',
        unlockedAt: new Date().toISOString(),
      });
    }
    if (timeBonus > 0 && timeRemainingSec > timeLimitSec * 0.5) {
      achievements.push({
        id: 'speed_demon',
        name: '极速通关',
        description: '还剩一半以上时间就完成了！',
        icon: '⚡',
        unlockedAt: new Date().toISOString(),
      });
    }

    return {
      baseScore,
      timeBonus,
      comboBonus,
      stars,
      xpGained,
      achievements,
    };
  }

  /** 判定是否通关 (至少1星 = ≥60%正确率) */
  static isPassed(correctCount: number, totalCount: number): boolean {
    if (totalCount === 0) return false;
    return correctCount / totalCount >= STAR_THRESHOLDS.one;
  }
}
