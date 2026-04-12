/**
 * Level questions per course — single-tenant B2B (SmartX demo)
 */

import type { QuizQuestion } from '@skillquest/types';

const SMARTX_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1', levelId: 'l1', type: 'single_choice',
    content: 'SmartX 超融合的分布式块存储引擎名称是什么？',
    options: [
      { id: 'a', text: 'ZBS (Zetta Block Storage)' },
      { id: 'b', text: 'aSAN' },
      { id: 'c', text: 'vSAN' },
      { id: 'd', text: 'Ceph' },
    ],
    correctOptionIds: ['a'],
    explanation: 'SmartX 自研的 ZBS (Zetta Block Storage) 是业界领先的分布式块存储引擎，支持副本和纠删码。',
    difficulty: 'beginner', knowledgePointTags: ['ZBS', '分布式存储', 'SmartX架构'],
  },
  {
    id: 'q2', levelId: 'l2', type: 'single_choice',
    content: 'SmartX SMTX OS 中 ELF 虚拟化平台基于什么技术？',
    options: [
      { id: 'a', text: 'KVM + 自研优化' },
      { id: 'b', text: 'Xen Hypervisor' },
      { id: 'c', text: 'VMware ESXi' },
      { id: 'd', text: 'Hyper-V' },
    ],
    correctOptionIds: ['a'],
    explanation: 'ELF 是 SmartX 基于 KVM 深度优化的企业级虚拟化平台，支持热迁移、HA、DRS 等高级特性。',
    difficulty: 'beginner', knowledgePointTags: ['ELF', 'KVM', '虚拟化平台'],
  },
  {
    id: 'q3', levelId: 'l3', type: 'single_choice',
    content: 'CloudTower 在 SmartX 产品体系中扮演什么角色？',
    options: [
      { id: 'a', text: '统一管理平台 (多集群管理与运维)' },
      { id: 'b', text: '分布式存储引擎' },
      { id: 'c', text: '网络SDN控制器' },
      { id: 'd', text: '备份灾备系统' },
    ],
    correctOptionIds: ['a'],
    explanation: 'CloudTower 是 SmartX 的统一管理平台，支持多集群纳管、自动化运维、API集成和监控告警。',
    difficulty: 'intermediate', knowledgePointTags: ['CloudTower', '集群管理', 'API'],
  },
];

const QUESTIONS: Record<string, QuizQuestion[]> = {
  'smartx-halo': SMARTX_QUESTIONS,
  'smartx-migration': SMARTX_QUESTIONS,
  'smartx-zbs': SMARTX_QUESTIONS,
  'smartx-cloudtower': SMARTX_QUESTIONS,
};

export function getLevelQuestions(courseId: string): QuizQuestion[] {
  return QUESTIONS[courseId] ?? [];
}
