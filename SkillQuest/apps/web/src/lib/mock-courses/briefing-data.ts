/**
 * Level Briefing data — 关卡前知识普及
 *
 * 解决用户"登录后不知道要做什么"的问题：
 * 每个关卡在正式开始前，先展示本关涉及的知识点和目标。
 *
 * 生产环境中，这些数据由 AI Engine 从课程文档自动生成。
 */

import type { LevelBriefing } from '@skillquest/types';

// ─── SmartX HALO 课程关卡知识普及 ──────────────────────────────────

const SMARTX_HALO_BRIEFINGS: LevelBriefing[] = [
  {
    levelId: 'l1',
    title: 'SMTX OS 架构概述',
    summary: '了解 SmartX 超融合操作系统 SMTX OS 的整体架构和核心组件。',
    knowledgePoints: [
      { term: 'SMTX OS', definition: 'SmartX 自研的超融合操作系统，将计算、存储、网络融合在一台标准 x86 服务器上' },
      { term: 'ZBS', definition: 'Zetta Block Storage — SmartX 自研分布式块存储引擎，支持副本和纠删码' },
      { term: 'ELF', definition: '基于 KVM 深度优化的企业级虚拟化平台，支持热迁移和高可用' },
      { term: 'CloudTower', definition: '统一管理平台，支持多集群纳管、自动化运维和 API 集成' },
    ],
    objectives: [
      { text: '能说出 SMTX OS 的三大核心组件名称及其职责', primary: true },
      { text: '理解超融合架构与传统三层架构的区别', primary: true },
      { text: '达到 80% 以上正确率获得 3 星评价', primary: false },
    ],
    gameTypeHint: '选择题',
    estimatedMinutes: 3,
    difficulty: 'beginner',
    tips: [
      '记住三大核心：ZBS(存储) + ELF(计算) + CloudTower(管理)',
      '超融合 = 计算+存储 融合在同一节点上',
    ],
  },
  {
    levelId: 'l2',
    title: 'ZBS 分布式存储',
    summary: '深入理解 ZBS 分布式块存储引擎的架构和数据保护机制。',
    knowledgePoints: [
      { term: 'ZBS', definition: 'Zetta Block Storage — 高性能分布式块存储，支持 2 副本/3 副本和纠删码' },
      { term: '数据副本', definition: '同一份数据在多个节点保存多个拷贝，确保单节点故障不丢数据' },
      { term: '纠删码 (EC)', definition: '一种空间效率更高的数据保护方式，用更少空间实现类似可靠性' },
      { term: '数据重建', definition: '节点故障后系统自动在其他节点重建丢失的数据副本' },
    ],
    objectives: [
      { text: '理解 ZBS 分布式存储的基本工作原理', primary: true },
      { text: '区分副本和纠删码两种数据保护策略', primary: true },
      { text: '了解数据重建的触发条件和过程', primary: false },
    ],
    gameTypeHint: '选择题',
    estimatedMinutes: 3,
    difficulty: 'beginner',
    tips: [
      '2 副本 = 数据存 2 份，可容忍 1 节点故障',
      '纠删码空间利用率更高但计算开销更大',
    ],
    interactiveDemo: {
      href: '/data-gravity/story?from=level&levelId=2',
      label: '🎬 互动体验：ZBS 数据流可视化',
      description: '通过 5 个互动场景，直观理解文件如何写入、数据如何分布、节点故障后如何自动恢复。',
    },
  },
  {
    levelId: 'l3',
    title: 'ELF 虚拟化引擎',
    summary: '掌握 ELF 虚拟化平台的核心技术和企业级特性。',
    knowledgePoints: [
      { term: 'ELF', definition: '基于 KVM 的企业级虚拟化平台，提供虚拟机生命周期管理' },
      { term: 'KVM', definition: 'Linux 内核虚拟化模块，ELF 在此基础上做了深度优化' },
      { term: '热迁移', definition: '不停机将运行中的虚拟机从一台物理主机迁移到另一台' },
      { term: 'HA (高可用)', definition: '当主机故障时自动在其他主机上重启受影响的虚拟机' },
    ],
    objectives: [
      { text: '了解 ELF 虚拟化平台的技术基础 (KVM)', primary: true },
      { text: '理解热迁移和 HA 的区别和使用场景', primary: true },
    ],
    gameTypeHint: '选择题',
    estimatedMinutes: 3,
    difficulty: 'beginner',
    tips: [
      '热迁移 = 主动调度（计划内），HA = 被动保护（计划外故障）',
    ],
  },
  {
    levelId: 'l4',
    title: 'CloudTower 集群管理',
    summary: '学习通过 CloudTower 进行多集群管理和日常运维操作。',
    knowledgePoints: [
      { term: 'CloudTower', definition: '统一管理平台，一个界面管理所有 SMTX OS 集群' },
      { term: '多集群纳管', definition: '将分布在不同地点的多个集群统一纳入管理' },
      { term: 'API 集成', definition: 'CloudTower 提供 RESTful API 和 GraphQL 接口对接第三方系统' },
      { term: 'scli', definition: 'SmartX CLI 命令行工具，用于管理集群和虚拟机' },
    ],
    objectives: [
      { text: '了解 CloudTower 的主要功能模块', primary: true },
      { text: '掌握基本的拓扑结构连线', primary: true },
    ],
    gameTypeHint: '拓扑连线',
    estimatedMinutes: 5,
    difficulty: 'intermediate',
    tips: [
      '注意管理网和存储网是分开的两个网络',
      '拓扑连线题需要将正确的端口连接起来',
    ],
  },
  {
    levelId: 'l5',
    title: 'HALO 网络配置',
    summary: '动手实践 SmartX HALO 三节点集群的网络拓扑配置。',
    knowledgePoints: [
      { term: '管理网络', definition: '用于集群管理通信、CloudTower 连接、运维操作的网络' },
      { term: '存储网络', definition: '用于 ZBS 节点间数据复制和 IO 通信的专用高速网络 (25GbE)' },
      { term: '网络分离', definition: '管理流量和存储流量走不同物理链路，避免相互影响' },
      { term: '25GbE', definition: '25 千兆以太网，SmartX 推荐的存储网络带宽规格' },
    ],
    objectives: [
      { text: '正确完成三节点集群的管理网+存储网拓扑连线', primary: true },
      { text: '理解为什么管理网和存储网要分离', primary: true },
      { text: '了解 25GbE 存储网对 IO 性能的保障作用', primary: false },
    ],
    gameTypeHint: '拓扑连线',
    estimatedMinutes: 5,
    difficulty: 'intermediate',
    tips: [
      '每台 HALO 服务器有 2 个网口：管理口和存储口',
      '管理网口连管理交换机，存储网口连存储交换机',
      '不要把管理口和存储口连到同一个交换机上',
    ],
  },
  {
    levelId: 'l6',
    title: 'ZBS 数据保护与快照',
    summary: '将 SmartX 产品组件与其核心功能正确配对。',
    knowledgePoints: [
      { term: 'ZBS', definition: '分布式块存储引擎' },
      { term: 'ELF', definition: 'KVM 虚拟化平台' },
      { term: 'CloudTower', definition: '统一集群管理平台' },
      { term: 'SMTX OS', definition: '超融合操作系统，包含以上所有组件' },
    ],
    objectives: [
      { text: '将每个 SmartX 组件与其正确的功能描述配对', primary: true },
      { text: '加深对 SmartX 产品体系的整体认识', primary: true },
    ],
    gameTypeHint: '知识配对',
    estimatedMinutes: 3,
    difficulty: 'beginner',
    tips: [
      '仔细阅读左右两列的描述',
      '每个组件只对应一个功能描述',
    ],
  },
  {
    levelId: 'l7',
    title: '集群扩容与迁移',
    summary: '通过故障排查情景模拟，学习处理 HALO 集群存储 IO 异常的最佳实践。',
    knowledgePoints: [
      { term: 'IO 延迟', definition: '存储读写请求的响应时间，正常应在 1-5ms，超过 20ms 需要关注' },
      { term: '数据重建', definition: '磁盘故障后 ZBS 自动在其他节点重建副本的过程，会消耗 IO 带宽' },
      { term: '热迁移', definition: '将运行中的虚拟机从高负载节点迁移到空闲节点以减轻压力' },
      { term: 'ZBS 存储性能指标', definition: 'IOPS（每秒 IO 操作数）、延迟（ms）、带宽（MB/s）三大核心指标' },
    ],
    objectives: [
      { text: '学会在故障场景中选择最优处理路径', primary: true },
      { text: '理解为什么直接重启不是好的选择', primary: true },
      { text: '掌握热迁移缓解 IO 压力的方法', primary: false },
    ],
    gameTypeHint: '故障排查',
    estimatedMinutes: 5,
    difficulty: 'intermediate',
    tips: [
      '面对故障先诊断再处理，不要急于重启',
      '数据重建期间节点 IO 会升高是正常现象',
      '热迁移业务 VM 是缓解重建压力的常用手段',
    ],
  },
  {
    levelId: 'l8',
    title: 'HALO 故障排查实战',
    summary: '综合运用所学知识，处理 HALO 集群的复杂故障场景。',
    knowledgePoints: [
      { term: '集群健康检查', definition: '通过 CloudTower 监控和 scli 命令确认集群各组件状态' },
      { term: '故障定位', definition: '从告警信息出发，逐步缩小故障范围到具体组件' },
      { term: 'SLA', definition: '服务等级协议，定义了系统可用性承诺（如 99.99%）' },
      { term: '故障恢复', definition: '根据故障类型选择修复、迁移、重建等恢复策略' },
    ],
    objectives: [
      { text: '能独立完成一次完整的故障排查流程', primary: true },
      { text: '在限定时间内选择最优恢复策略', primary: true },
      { text: '最小化 SLA 影响', primary: false },
    ],
    gameTypeHint: '故障排查',
    estimatedMinutes: 8,
    difficulty: 'advanced',
    tips: [
      '排查流程：告警 → 定位 → 评估 → 决策 → 执行 → 验证',
      '注意时间限制，优先处理影响最大的问题',
    ],
  },
];

// ─── 所有课程复用 HALO 关卡普及数据 (demo 模式) ─────────────────────

const BRIEFINGS: Record<string, LevelBriefing[]> = {
  'smartx-halo': SMARTX_HALO_BRIEFINGS,
  'smartx-migration': SMARTX_HALO_BRIEFINGS,
  'smartx-zbs': SMARTX_HALO_BRIEFINGS,
  'smartx-cloudtower': SMARTX_HALO_BRIEFINGS,
};

/**
 * 获取指定课程指定关卡的知识普及数据
 */
export function getLevelBriefing(courseId: string, levelId: string): LevelBriefing | null {
  const list = BRIEFINGS[courseId];
  if (!list) return null;
  return list.find((b) => b.levelId === levelId) ?? null;
}

/**
 * 获取指定课程所有关卡的知识普及数据
 */
export function getCourseBriefings(courseId: string): LevelBriefing[] {
  return BRIEFINGS[courseId] ?? [];
}
