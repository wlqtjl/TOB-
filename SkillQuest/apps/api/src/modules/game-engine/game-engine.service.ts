/**
 * 游戏引擎 Service — 连接 @skillquest/game-engine 包
 *
 * 管理关卡状态机、评分、拓扑验证
 */

import { Injectable } from '@nestjs/common';
import { LevelStateMachine, ScoringEngine, TopologyEngine, ComboTracker } from '@skillquest/game-engine';
import type { LevelNode, ScoreResult, LevelMapData, TopologyQuizLevel } from '@skillquest/types';

@Injectable()
export class GameEngineService {
  private machines = new Map<string, LevelStateMachine>();

  /** 为某课程初始化状态机 */
  initCourse(courseId: string, levels: LevelNode[]): void {
    this.machines.set(courseId, new LevelStateMachine(levels));
  }

  /** 获取闯关地图数据 */
  getMapData(courseId: string): LevelMapData | null {
    const machine = this.machines.get(courseId);
    if (!machine) return null;
    return machine.generateMapData(courseId);
  }

  /** 开始关卡 */
  startLevel(courseId: string, levelId: string): boolean {
    const machine = this.machines.get(courseId);
    if (!machine) return false;
    return machine.startLevel(levelId);
  }

  /** 提交答题结果 */
  submitResult(
    courseId: string,
    levelId: string,
    correctCount: number,
    totalCount: number,
    timeRemainingSec: number,
    timeLimitSec: number,
    maxCombo: number,
  ): { score: ScoreResult; unlockedLevels: string[] } | null {
    const machine = this.machines.get(courseId);
    if (!machine) return null;

    const score = ScoringEngine.calculate({
      correctCount,
      totalCount,
      timeRemainingSec,
      timeLimitSec,
      maxCombo,
    });

    const passed = ScoringEngine.isPassed(correctCount, totalCount);
    let unlockedLevels: string[] = [];

    if (passed) {
      unlockedLevels = machine.passLevel(levelId, score.stars);
    } else {
      machine.failLevel(levelId);
    }

    return { score, unlockedLevels };
  }

  /** 验证拓扑连线 */
  validateTopology(quiz: TopologyQuizLevel, userConnections: Array<{ fromPortId: string; toPortId: string }>) {
    return TopologyEngine.validateConnections(userConnections, quiz.correctConnections);
  }

  /** 计算数据包动画路径 */
  getPacketAnimationPath(quiz: TopologyQuizLevel) {
    return TopologyEngine.computePacketAnimationPath(quiz);
  }
}
