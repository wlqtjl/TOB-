/**
 * Level questions per course — multi-vendor
 */

import type { QuizQuestion } from '@skillquest/types';

const QUESTIONS: Record<string, QuizQuestion[]> = {
  // ─── 华为 HCIA ──────────────────────────────────────────────────
  'huawei-hcia-datacom': [
    {
      id: 'q1', levelId: 'l4', type: 'single_choice',
      content: '在华为交换机上创建VLAN 10，正确的命令是？',
      options: [
        { id: 'a', text: 'vlan 10' },
        { id: 'b', text: 'create vlan 10' },
        { id: 'c', text: 'add vlan 10' },
        { id: 'd', text: 'set vlan 10' },
      ],
      correctOptionIds: ['a'],
      explanation: '在华为VRP系统视图下，直接输入 "vlan 10" 即可创建并进入VLAN 10视图。',
      difficulty: 'beginner', knowledgePointTags: ['VLAN', 'VRP命令', '交换机配置'],
    },
    {
      id: 'q2', levelId: 'l4', type: 'single_choice',
      content: 'Trunk端口默认允许通过哪些VLAN的流量？',
      options: [
        { id: 'a', text: '只允许VLAN 1' },
        { id: 'b', text: '允许所有VLAN' },
        { id: 'c', text: '不允许任何VLAN' },
        { id: 'd', text: '只允许管理VLAN' },
      ],
      correctOptionIds: ['b'],
      explanation: 'Trunk端口默认允许所有VLAN通过。可以使用 "port trunk allow-pass vlan" 命令限制。',
      difficulty: 'beginner', knowledgePointTags: ['Trunk', 'VLAN', '端口类型'],
    },
    {
      id: 'q3', levelId: 'l4', type: 'single_choice',
      content: '以下哪种端口类型会在发送帧时剥离VLAN标签？',
      options: [
        { id: 'a', text: 'Trunk端口' },
        { id: 'b', text: 'Hybrid端口（发送时untagged的VLAN）' },
        { id: 'c', text: 'Access端口' },
        { id: 'd', text: 'B和C都正确' },
      ],
      correctOptionIds: ['d'],
      explanation: 'Access端口发送时一定剥离标签；Hybrid端口对untagged的VLAN也会剥离标签。两者都正确。',
      difficulty: 'intermediate', knowledgePointTags: ['Access', 'Hybrid', 'VLAN标签'],
    },
  ],

  // ─── 深信服超融合 HCI ────────────────────────────────────────────
  'sangfor-hci': [
    {
      id: 'q1', levelId: 'l1', type: 'single_choice',
      content: '深信服超融合HCI的分布式存储引擎叫什么？',
      options: [
        { id: 'a', text: 'aSAN' },
        { id: 'b', text: 'vSAN' },
        { id: 'c', text: 'Ceph' },
        { id: 'd', text: 'ZBS' },
      ],
      correctOptionIds: ['a'],
      explanation: '深信服超融合使用自研的aSAN分布式存储引擎，非VMware vSAN也非SmartX ZBS。',
      difficulty: 'beginner', knowledgePointTags: ['aSAN', '分布式存储', 'HCI架构'],
    },
    {
      id: 'q2', levelId: 'l1', type: 'single_choice',
      content: '深信服HCI最少需要几个节点组成集群？',
      options: [
        { id: 'a', text: '1个节点' },
        { id: 'b', text: '2个节点' },
        { id: 'c', text: '3个节点' },
        { id: 'd', text: '4个节点' },
      ],
      correctOptionIds: ['c'],
      explanation: '深信服HCI标准部署最少需要3个节点，以满足数据三副本的高可用要求。2节点需要额外仲裁。',
      difficulty: 'beginner', knowledgePointTags: ['集群部署', '最小规模', '高可用'],
    },
    {
      id: 'q3', levelId: 'l2', type: 'single_choice',
      content: 'aSAN存储中，数据副本数默认为几份？',
      options: [
        { id: 'a', text: '1副本' },
        { id: 'b', text: '2副本' },
        { id: 'c', text: '3副本' },
        { id: 'd', text: '4副本' },
      ],
      correctOptionIds: ['c'],
      explanation: 'aSAN默认三副本策略，保障在任一节点故障时数据不丢失，自动恢复。',
      difficulty: 'intermediate', knowledgePointTags: ['aSAN', '副本策略', '数据保护'],
    },
  ],

  // ─── 安超云 OS ──────────────────────────────────────────────────
  'anchao-cloud': [
    {
      id: 'q1', levelId: 'l1', type: 'single_choice',
      content: '安超云OS基于哪个开源技术构建虚拟化层？',
      options: [
        { id: 'a', text: 'KVM + QEMU' },
        { id: 'b', text: 'Xen' },
        { id: 'c', text: 'Hyper-V' },
        { id: 'd', text: 'ESXi' },
      ],
      correctOptionIds: ['a'],
      explanation: '安超云OS基于KVM+QEMU虚拟化技术栈，配合自研云管平台实现资源编排。',
      difficulty: 'beginner', knowledgePointTags: ['KVM', '虚拟化', '安超云架构'],
    },
    {
      id: 'q2', levelId: 'l1', type: 'single_choice',
      content: '安超云中创建云主机时，以下哪项不是必选配置？',
      options: [
        { id: 'a', text: 'CPU和内存规格' },
        { id: 'b', text: '系统盘镜像' },
        { id: 'c', text: 'GPU直通设备' },
        { id: 'd', text: '虚拟网络' },
      ],
      correctOptionIds: ['c'],
      explanation: 'GPU直通是可选高级功能。创建云主机必须配置：CPU/内存规格、系统盘镜像、虚拟网络。',
      difficulty: 'beginner', knowledgePointTags: ['云主机', '资源配置', '必选参数'],
    },
    {
      id: 'q3', levelId: 'l3', type: 'single_choice',
      content: '安超云存储池支持的后端类型不包括？',
      options: [
        { id: 'a', text: '本地磁盘' },
        { id: 'b', text: 'Ceph分布式存储' },
        { id: 'c', text: 'NFS共享存储' },
        { id: 'd', text: 'AWS S3对象存储' },
      ],
      correctOptionIds: ['d'],
      explanation: '安超云存储池支持本地盘、Ceph、NFS等后端，但不直接支持AWS S3作为虚拟机块存储后端。',
      difficulty: 'intermediate', knowledgePointTags: ['存储池', 'Ceph', '后端类型'],
    },
  ],

  // ─── SmartX HALO 超融合 ──────────────────────────────────────────
  'smartx-halo': [
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
  ],
};

export function getLevelQuestions(courseId: string): QuizQuestion[] {
  return QUESTIONS[courseId] ?? [];
}
