/**
 * calculateDeviations — 偏离检测算法
 *
 * 遍历 playerSteps，对比相同序号下的 expertSteps。
 * 若 actionName 不匹配，计算该步操作带来的"时间偏移量"和"风险增量"，
 * 返回偏离点列表。
 */

import type { TimelineStep, DeviationPoint } from '@skillquest/types';

/**
 * 对比玩家路径和专家路径，返回所有偏离点
 */
export function calculateDeviations(
  playerSteps: TimelineStep[],
  expertSteps: TimelineStep[],
): DeviationPoint[] {
  const deviations: DeviationPoint[] = [];

  const len = Math.min(playerSteps.length, expertSteps.length);

  for (let i = 0; i < len; i++) {
    const ps = playerSteps[i];
    const es = expertSteps[i];
    if (ps.actionName !== es.actionName || ps.status === 'error' || ps.status === 'warning') {
      deviations.push({
        playerStep: ps,
        expertStep: es,
        timeOffset: ps.timestamp - es.timestamp,
        riskDelta: Math.abs(ps.impactScore),
      });
    }
  }

  return deviations;
}

/**
 * 基于 impactScore 生成 SLA 损耗曲线数据点
 * 返回 [timestamp, slaPercent][] 用于 SVG 路径绘制
 */
export function computeSLACurve(
  playerSteps: TimelineStep[],
  initialSLA: number = 99.99,
): Array<[number, number]> {
  const points: Array<[number, number]> = [[0, initialSLA]];
  let currentSLA = initialSLA;

  for (const step of playerSteps) {
    // impactScore is negative for bad actions
    if (step.impactScore < 0) {
      // Scale: -100 impact → ~0.5% SLA drop
      const drop = Math.abs(step.impactScore) * 0.005;
      currentSLA = Math.max(0, currentSLA - drop);
    }
    points.push([step.timestamp, currentSLA]);
  }

  return points;
}
