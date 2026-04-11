/**
 * 连击追踪器 — 对标 Data Center 的即时反馈循环
 *
 * 连续答对 → combo 累加 → 粒子加速/颜色变化/分数加成
 * 答错 → combo 归零 → 震动反馈
 */

export interface ComboState {
  current: number;
  max: number;
  /** 连击倍率: 1.0 (无combo) → 1.5 (3连) → 2.0 (5连) → 3.0 (10连) */
  multiplier: number;
  /** 连击等级: 触发不同视觉效果 */
  tier: 'none' | 'good' | 'great' | 'amazing' | 'legendary';
}

const TIER_THRESHOLDS: Array<{ min: number; tier: ComboState['tier']; multiplier: number }> = [
  { min: 10, tier: 'legendary', multiplier: 3.0 },
  { min: 7, tier: 'amazing', multiplier: 2.5 },
  { min: 5, tier: 'great', multiplier: 2.0 },
  { min: 3, tier: 'good', multiplier: 1.5 },
  { min: 0, tier: 'none', multiplier: 1.0 },
];

export class ComboTracker {
  private current = 0;
  private max = 0;

  /** 答对: combo +1 */
  hit(): ComboState {
    this.current++;
    if (this.current > this.max) {
      this.max = this.current;
    }
    return this.getState();
  }

  /** 答错: combo 归零 */
  miss(): ComboState {
    this.current = 0;
    return this.getState();
  }

  /** 获取当前连击状态 */
  getState(): ComboState {
    const tier = TIER_THRESHOLDS.find((t) => this.current >= t.min) ?? TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1];
    return {
      current: this.current,
      max: this.max,
      multiplier: tier.multiplier,
      tier: tier.tier,
    };
  }

  /** 重置 */
  reset(): void {
    this.current = 0;
    this.max = 0;
  }
}
