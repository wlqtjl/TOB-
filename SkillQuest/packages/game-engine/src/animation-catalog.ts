/**
 * 默认动画目录 — 通用 IT 基础设施动画映射
 *
 * 设计目标: 厂商无关
 * 不论是 SmartX HALO、华为 FusionCompute、VMware vSphere 还是 Nutanix AHV,
 * 它们的节点状态变化都可以映射到通用的视觉效果。
 *
 * 厂商可以通过自定义 AnimationCatalog 覆盖/扩展这些默认映射。
 */

import type {
  AnimationCatalog,
  AnimationMapping,
  AnimationEffect,
  AnimationEffectType,
} from '@skillquest/types';

// ─── 预置动画效果 ─────────────────────────────────────────────────

/** 创建一个动画效果 */
function fx(
  type: AnimationEffectType,
  color: string,
  durationMs: number,
  opts: Partial<AnimationEffect> = {},
): AnimationEffect {
  return {
    type,
    color,
    durationMs,
    intensity: 0.8,
    loop: false,
    ...opts,
  };
}

// ─── 节点状态变化映射 ─────────────────────────────────────────────

const NODE_STATUS_MAPPINGS: AnimationMapping[] = [
  // 节点离线
  {
    id: 'node-offline',
    trigger: 'node.status.normal→offline',
    effects: [
      fx('fade_out', '#ef4444', 800, { intensity: 1.0 }),
      fx('spark', '#ef4444', 600, { particleCount: 40, intensity: 0.9 }),
    ],
    priority: 10,
    description: '节点离线: 淡出 + 红色火花',
  },
  // 节点重启中
  {
    id: 'node-rebooting',
    trigger: 'node.status.offline→rebooting',
    effects: [
      fx('pulse', '#f59e0b', 2000, { loop: true, intensity: 0.6 }),
      fx('progress_bar', '#f59e0b', 30000, { intensity: 0.5 }),
    ],
    priority: 8,
    description: '节点重启: 黄色脉冲 + 进度条',
  },
  // 节点恢复
  {
    id: 'node-recovered',
    trigger: 'node.status.rebooting→normal',
    effects: [
      fx('fade_in', '#22c55e', 600),
      fx('burst', '#22c55e', 400, { particleCount: 30 }),
      fx('ripple', '#22c55e', 800, { intensity: 0.7 }),
    ],
    priority: 8,
    description: '节点恢复: 绿色淡入 + 粒子爆发 + 波纹',
  },
  // 节点降级
  {
    id: 'node-degraded',
    trigger: 'node.status.normal→degraded',
    effects: [
      fx('blink', '#f59e0b', 1500, { loop: true, intensity: 0.5 }),
    ],
    priority: 7,
    description: '节点降级: 黄色闪烁',
  },
  // 脑裂
  {
    id: 'node-split-brain',
    trigger: 'node.status.*→split_brain',
    effects: [
      fx('split', '#ef4444', 1200, { intensity: 1.0 }),
      fx('shake', '#ef4444', 500, { intensity: 0.8 }),
      fx('spark', '#ef4444', 1000, { particleCount: 60, intensity: 1.0 }),
    ],
    priority: 15,
    description: '脑裂: 分裂效果 + 震动 + 红色火花',
  },
  // 节点过载
  {
    id: 'node-overloaded',
    trigger: 'node.status.normal→overloaded',
    effects: [
      fx('heat_map', '#ef4444', 3000, { loop: true, intensity: 0.8 }),
      fx('pulse', '#f97316', 1000, { loop: true, intensity: 0.6 }),
    ],
    priority: 6,
    description: '节点过载: 热力图 + 橙色脉冲',
  },
  // 节点维护
  {
    id: 'node-maintenance',
    trigger: 'node.status.*→maintenance',
    effects: [
      fx('blink', '#6366f1', 2000, { loop: true, intensity: 0.3 }),
    ],
    priority: 3,
    description: '节点维护: 蓝紫色慢闪',
  },
  // 节点恢复中
  {
    id: 'node-recovering',
    trigger: 'node.status.*→recovering',
    effects: [
      fx('progress_bar', '#3b82f6', 15000, { intensity: 0.6 }),
      fx('trail', '#3b82f6', 5000, { loop: true, intensity: 0.5 }),
    ],
    priority: 7,
    description: '恢复中: 蓝色进度条 + 数据流拖尾',
  },
];

// ─── 网络状态变化映射 ─────────────────────────────────────────────

const NETWORK_STATUS_MAPPINGS: AnimationMapping[] = [
  // 网络分区
  {
    id: 'link-partitioned',
    trigger: 'link.status.connected→partitioned',
    effects: [
      fx('connection_break', '#ef4444', 800, { intensity: 1.0 }),
      fx('spark', '#ef4444', 600, { particleCount: 20 }),
    ],
    priority: 12,
    description: '网络分区: 连线断裂 + 红闪',
  },
  // 网络降级
  {
    id: 'link-degraded',
    trigger: 'link.status.connected→degraded',
    effects: [
      fx('blink', '#f59e0b', 2000, { loop: true, intensity: 0.4 }),
    ],
    priority: 5,
    description: '网络降级: 连线黄色闪烁',
  },
  // 网络恢复
  {
    id: 'link-recovered',
    trigger: 'link.status.partitioned→connected',
    effects: [
      fx('merge', '#22c55e', 800),
      fx('ripple', '#22c55e', 600, { intensity: 0.6 }),
    ],
    priority: 8,
    description: '网络恢复: 合并效果 + 绿色波纹',
  },
  // 完全断开
  {
    id: 'link-disconnected',
    trigger: 'link.status.*→disconnected',
    effects: [
      fx('connection_break', '#ef4444', 500, { intensity: 1.0 }),
      fx('fade_out', '#6b7280', 300),
    ],
    priority: 10,
    description: '完全断开: 断裂 + 灰色淡出',
  },
];

// ─── 数据操作映射 ─────────────────────────────────────────────────

const DATA_OPERATION_MAPPINGS: AnimationMapping[] = [
  // 数据重平衡
  {
    id: 'data-rebalance',
    trigger: 'node.action.rebalance',
    effects: [
      fx('flow_redirect', '#3b82f6', 5000, { loop: true, intensity: 0.7 }),
      fx('trail', '#60a5fa', 3000, { loop: true }),
    ],
    priority: 6,
    description: '数据重平衡: 粒子流向转移',
  },
  // 数据丢失
  {
    id: 'data-loss',
    trigger: 'node.dataIntegrity.threshold_low',
    effects: [
      fx('data_scatter', '#ef4444', 1500, { particleCount: 50, intensity: 1.0 }),
      fx('shake', '#ef4444', 400, { intensity: 0.6 }),
    ],
    priority: 14,
    description: '数据丢失: 碎片散落 + 震动',
  },
  // 数据迁移
  {
    id: 'data-migration',
    trigger: 'node.action.migrate',
    effects: [
      fx('trail', '#8b5cf6', 8000, { loop: true, intensity: 0.6 }),
      fx('progress_bar', '#8b5cf6', 10000),
    ],
    priority: 5,
    description: '数据迁移: 紫色拖尾 + 进度条',
  },
  // 共识选举
  {
    id: 'consensus-election',
    trigger: 'node.action.election',
    effects: [
      fx('ripple', '#fbbf24', 1200, { intensity: 0.8 }),
      fx('highlight', '#fbbf24', 2000),
    ],
    priority: 9,
    description: '共识选举: 金色波纹 + 高亮',
  },
];

// ─── 灾难事件映射 ─────────────────────────────────────────────────

const DISASTER_MAPPINGS: AnimationMapping[] = [
  // 灾难性爆炸
  {
    id: 'disaster-explosion',
    trigger: 'disaster.catastrophic',
    effects: [
      fx('explosion', '#ef4444', 2000, { particleCount: 100, intensity: 1.0 }),
      fx('shake', '#ef4444', 1000, { intensity: 1.0 }),
      fx('countdown', '#ef4444', 3000),
    ],
    priority: 20,
    description: '灾难事件: 爆炸 + 强震 + 倒计时',
  },
  // 级联故障
  {
    id: 'disaster-cascading',
    trigger: 'disaster.cascading_failure',
    effects: [
      fx('spark', '#ef4444', 500, { particleCount: 30, intensity: 0.8 }),
      fx('fade_out', '#ef4444', 300, { intensity: 0.9 }),
    ],
    priority: 18,
    description: '级联故障: 逐个节点火花+淡出 (连锁效果)',
  },
];

// ─── 导出默认目录 ─────────────────────────────────────────────────

export const DEFAULT_ANIMATION_CATALOG: AnimationCatalog = {
  id: 'default',
  name: '通用 IT 基础设施动画',
  mappings: [
    ...NODE_STATUS_MAPPINGS,
    ...NETWORK_STATUS_MAPPINGS,
    ...DATA_OPERATION_MAPPINGS,
    ...DISASTER_MAPPINGS,
  ],
};

/**
 * 根据状态变化触发条件查找匹配的动画映射
 *
 * @param catalog 动画目录
 * @param trigger 状态变化触发条件 (如: "node.status.normal→offline")
 * @returns 匹配的动画映射列表 (按优先级降序)
 */
export function findMatchingAnimations(
  catalog: AnimationCatalog,
  trigger: string,
): AnimationMapping[] {
  return catalog.mappings
    .filter(m => {
      if (m.trigger === trigger) return true;
      // 通配符匹配: "node.status.*→offline" 匹配 "node.status.normal→offline"
      const pattern = m.trigger.replace(/\*/g, '[^.→]+');
      return new RegExp(`^${pattern}$`).test(trigger);
    })
    .sort((a, b) => b.priority - a.priority);
}

/**
 * 合并两个动画目录 (厂商自定义覆盖默认)
 *
 * @param base 基础目录 (如 DEFAULT_ANIMATION_CATALOG)
 * @param override 覆盖目录 (厂商自定义)
 * @returns 合并后的目录
 */
export function mergeAnimationCatalogs(
  base: AnimationCatalog,
  override: AnimationCatalog,
): AnimationCatalog {
  const overrideIds = new Set(override.mappings.map(m => m.id));
  const merged = [
    ...override.mappings,
    ...base.mappings.filter(m => !overrideIds.has(m.id)),
  ];

  return {
    id: override.id,
    name: override.name,
    vendor: override.vendor,
    mappings: merged,
  };
}
