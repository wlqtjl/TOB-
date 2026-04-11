/**
 * 关卡状态机 — 对标 Data Center 的 route evaluation
 *
 * 管理关卡 DAG (有向无环图):
 * - 检查前置条件 → 解锁后续关卡
 * - 通关判定 → 更新星级
 * - 生成闯关地图渲染数据
 */

import type {
  LevelNode,
  LevelStatus,
  LevelMapData,
  LevelMapNode,
  LevelMapEdge,
} from '@skillquest/types';

export class LevelStateMachine {
  private levels: Map<string, LevelNode>;

  constructor(levels: LevelNode[]) {
    this.levels = new Map(levels.map((l) => [l.id, { ...l }]));
  }

  /** 获取某个关卡 */
  getLevel(id: string): LevelNode | undefined {
    return this.levels.get(id);
  }

  /** 获取所有关卡 */
  getAllLevels(): LevelNode[] {
    return Array.from(this.levels.values());
  }

  /**
   * 检查关卡是否可以解锁:
   * 所有 prerequisites 关卡必须 status === 'passed'
   */
  canUnlock(levelId: string): boolean {
    const level = this.levels.get(levelId);
    if (!level) return false;
    if (level.status !== 'locked') return false;

    return level.prerequisites.every((preId) => {
      const pre = this.levels.get(preId);
      return pre?.status === 'passed';
    });
  }

  /**
   * 解锁可解锁的关卡 (通关后调用)
   * 返回新解锁的关卡 ID 列表
   */
  unlockAvailable(): string[] {
    const unlocked: string[] = [];
    for (const level of this.levels.values()) {
      if (level.status === 'locked' && this.canUnlock(level.id)) {
        level.status = 'unlocked';
        unlocked.push(level.id);
      }
    }
    return unlocked;
  }

  /** 标记关卡开始 */
  startLevel(levelId: string): boolean {
    const level = this.levels.get(levelId);
    if (!level || level.status !== 'unlocked') return false;
    level.status = 'in_progress';
    return true;
  }

  /** 标记关卡通过 */
  passLevel(levelId: string, stars: 0 | 1 | 2 | 3): string[] {
    const level = this.levels.get(levelId);
    if (!level) return [];
    level.status = 'passed';
    level.stars = stars;
    return this.unlockAvailable();
  }

  /** 标记关卡失败 (可重试) */
  failLevel(levelId: string): void {
    const level = this.levels.get(levelId);
    if (!level) return;
    level.status = 'unlocked'; // 允许重试
  }

  /**
   * 生成 Phaser.js 闯关地图渲染数据
   * 对标 Data Center 的整体布局视图
   */
  generateMapData(courseId: string): LevelMapData {
    const nodes: LevelMapNode[] = [];
    const edges: LevelMapEdge[] = [];

    for (const level of this.levels.values()) {
      if (level.courseId !== courseId) continue;

      nodes.push({
        levelId: level.id,
        title: level.title,
        type: level.type,
        status: level.status,
        stars: level.stars,
        x: level.position.x,
        y: level.position.y,
      });

      // 为每个前置关系生成一条边
      for (const preId of level.prerequisites) {
        const pre = this.levels.get(preId);
        if (!pre || pre.courseId !== courseId) continue;

        let particleState: LevelMapEdge['particleState'] = 'static';
        if (level.status === 'passed' || level.status === 'in_progress') {
          particleState = level.status === 'in_progress' ? 'pulsing' : 'flowing';
        } else if (level.status === 'unlocked') {
          particleState = 'pulsing';
        }

        edges.push({
          fromLevelId: preId,
          toLevelId: level.id,
          particleState,
        });
      }
    }

    return { courseId, nodes, edges };
  }
}
