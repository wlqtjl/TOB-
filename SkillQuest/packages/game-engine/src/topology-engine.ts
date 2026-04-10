/**
 * 拓扑引擎 — 对标 Data Center 游戏的 packet-ball 核心机制
 *
 * 1. 用 Graph 结构存储网络拓扑 (节点=端口, 边=线缆)
 * 2. BFS 算法验证连通性 + 计算数据包路径
 * 3. 校验用户连线是否满足目标拓扑
 * 4. 输出 Bezier 路径数据供 Phaser.js/PixiJS 粒子渲染
 */

import type {
  DeviceNode,
  Cable,
  ConnectionPair,
  TopologyQuizLevel,
} from '@skillquest/types';

/** 邻接表表示的图 */
type AdjacencyList = Map<string, Set<string>>;

export class TopologyEngine {
  /**
   * 从拓扑关卡数据构建邻接图
   * 只包含可见的边 (已连接的线缆)
   */
  static buildGraph(nodes: DeviceNode[], edges: Cable[]): AdjacencyList {
    const graph: AdjacencyList = new Map();

    // 初始化所有端口为节点
    for (const node of nodes) {
      for (const port of node.ports) {
        graph.set(port.id, new Set());
      }
    }

    // 添加端口间的物理连线
    for (const edge of edges) {
      if (!edge.visible) continue;
      const fromSet = graph.get(edge.fromPortId);
      const toSet = graph.get(edge.toPortId);
      if (fromSet) fromSet.add(edge.toPortId);
      if (toSet) toSet.add(edge.fromPortId);
    }

    // 添加设备内部端口互联 (同一设备的端口之间可通信)
    for (const node of nodes) {
      const portIds = node.ports.map((p) => p.id);
      for (let i = 0; i < portIds.length; i++) {
        for (let j = i + 1; j < portIds.length; j++) {
          const a = graph.get(portIds[i]);
          const b = graph.get(portIds[j]);
          if (a) a.add(portIds[j]);
          if (b) b.add(portIds[i]);
        }
      }
    }

    return graph;
  }

  /**
   * BFS 搜索两端口之间的最短路径
   * 对标 Data Center 的 BFS/Dijkstra 路由算法
   *
   * @returns 路径上的端口 ID 列表, 或 null (不可达)
   */
  static findPath(
    graph: AdjacencyList,
    startPortId: string,
    endPortId: string,
  ): string[] | null {
    if (startPortId === endPortId) return [startPortId];

    const visited = new Set<string>();
    const parent = new Map<string, string>();
    const queue: string[] = [startPortId];
    visited.add(startPortId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = graph.get(current);
      if (!neighbors) continue;

      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        parent.set(neighbor, current);

        if (neighbor === endPortId) {
          // 回溯路径
          const path: string[] = [];
          let node: string | undefined = endPortId;
          while (node !== undefined) {
            path.unshift(node);
            node = parent.get(node);
          }
          return path;
        }

        queue.push(neighbor);
      }
    }

    return null; // 不可达
  }

  /**
   * 验证用户的连线是否满足所有正确连接
   *
   * @returns { correct: 正确对数, total: 需要对数, allCorrect: 全部正确 }
   */
  static validateConnections(
    userConnections: ConnectionPair[],
    correctConnections: ConnectionPair[],
  ): { correct: number; total: number; allCorrect: boolean } {
    const total = correctConnections.length;
    let correct = 0;

    const userSet = new Set(
      userConnections.map(
        (c) => `${c.fromPortId}:${c.toPortId}`,
      ),
    );

    for (const cc of correctConnections) {
      const forward = `${cc.fromPortId}:${cc.toPortId}`;
      const reverse = `${cc.toPortId}:${cc.fromPortId}`;
      if (userSet.has(forward) || userSet.has(reverse)) {
        correct++;
      }
    }

    return { correct, total, allCorrect: correct === total };
  }

  /**
   * 计算答对后的数据包动画路径
   * 返回设备节点坐标序列, 供 Phaser.js Bezier 曲线粒子渲染
   *
   * 这是对标 Data Center packet-balls 的核心视觉输出
   */
  static computePacketAnimationPath(
    quiz: TopologyQuizLevel,
  ): Array<{ x: number; y: number; nodeId: string }> {
    const nodeMap = new Map(quiz.nodes.map((n) => [n.id, n]));
    const portToDevice = new Map<string, string>();

    for (const node of quiz.nodes) {
      for (const port of node.ports) {
        portToDevice.set(port.id, node.id);
      }
    }

    // 数据包路径定义的是端口 ID 序列，映射到设备坐标 (去重相邻同设备)
    const path: Array<{ x: number; y: number; nodeId: string }> = [];
    let lastDeviceId = '';

    for (const portId of quiz.packetPath) {
      const deviceId = portToDevice.get(portId);
      if (!deviceId || deviceId === lastDeviceId) continue;

      const device = nodeMap.get(deviceId);
      if (!device) continue;

      path.push({ x: device.x, y: device.y, nodeId: deviceId });
      lastDeviceId = deviceId;
    }

    return path;
  }

  /**
   * 从设备坐标序列生成 Bezier 控制点
   * 用于 Phaser.js / Canvas 粒子流动画
   */
  static generateBezierPoints(
    path: Array<{ x: number; y: number }>,
  ): Array<{ x: number; y: number; cx: number; cy: number }> {
    if (path.length < 2) return [];

    const result: Array<{ x: number; y: number; cx: number; cy: number }> = [];

    for (let i = 0; i < path.length - 1; i++) {
      const p0 = path[i];
      const p1 = path[i + 1];

      // 控制点: 取两端点的中点偏移 (制造曲线感)
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      const offset = 30; // 曲线偏移量

      result.push({
        x: p1.x,
        y: p1.y,
        cx: midX + (i % 2 === 0 ? offset : -offset),
        cy: midY + (i % 2 === 0 ? -offset : offset),
      });
    }

    return result;
  }
}
