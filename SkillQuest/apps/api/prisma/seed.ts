/**
 * Database Seed Script — 从 Mock 数据填充 PostgreSQL
 *
 * 用法: npx ts-node prisma/seed.ts
 *       或通过 prisma db seed 自动执行
 *
 * 创建:
 * - 1 个默认租户
 * - 1 个演示用户 (demo@skillquest.dev / password)
 * - 3 门课程 (华为/深信服/安超)
 * - 每门课程 8 个关卡 (含完整游戏内容)
 * - 排行榜用户和分数数据
 * - 演示用户的进度数据
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Mock Data (mirrors apps/web/src/lib/mock-courses) ──────────

const COURSES_DATA = [
  {
    id: 'huawei-hcia-datacom',
    title: '华为 HCIA-Datacom',
    vendor: '华为',
    category: 'NETWORK' as const,
    description: '数通基础认证：VLAN、路由协议、VRP命令行',
  },
  {
    id: 'sangfor-hci',
    title: '深信服超融合 HCI',
    vendor: '深信服',
    category: 'VIRTUALIZATION' as const,
    description: '超融合部署：aSAN存储、虚拟机调度、高可用、备份恢复',
  },
  {
    id: 'anchao-cloud',
    title: '安超云 OS',
    vendor: '安超',
    category: 'CLOUD' as const,
    description: '私有云部署：云主机管理、存储策略、网络虚拟化、监控运维',
  },
];

const LEVELS_DATA: Record<string, Array<{
  id: string; sortOrder: number; title: string;
  type: 'QUIZ' | 'ORDERING' | 'MATCHING' | 'TOPOLOGY' | 'TERMINAL' | 'SCENARIO' | 'VM_PLACEMENT';
  posX: number; posY: number; prerequisites: string[];
  demoStatus?: string; demoStars?: number;
}>> = {
  'huawei-hcia-datacom': [
    { id: 'huawei-l1', sortOrder: 1, title: '网络基础概念', type: 'QUIZ', posX: 200, posY: 100, prerequisites: [], demoStatus: 'PASSED', demoStars: 3 },
    { id: 'huawei-l2', sortOrder: 2, title: 'OSI七层模型', type: 'QUIZ', posX: 400, posY: 80, prerequisites: ['huawei-l1'], demoStatus: 'PASSED', demoStars: 2 },
    { id: 'huawei-l3', sortOrder: 3, title: 'TCP/IP协议栈', type: 'QUIZ', posX: 600, posY: 120, prerequisites: ['huawei-l2'], demoStatus: 'PASSED', demoStars: 3 },
    { id: 'huawei-l4', sortOrder: 4, title: 'VLAN配置实验', type: 'TOPOLOGY', posX: 350, posY: 250, prerequisites: ['huawei-l1', 'huawei-l2'], demoStatus: 'UNLOCKED' },
    { id: 'huawei-l5', sortOrder: 5, title: 'VRP命令行基础', type: 'TERMINAL', posX: 550, posY: 230, prerequisites: ['huawei-l2', 'huawei-l3'], demoStatus: 'UNLOCKED' },
    { id: 'huawei-l6', sortOrder: 6, title: 'STP协议原理', type: 'QUIZ', posX: 200, posY: 380, prerequisites: ['huawei-l4'] },
    { id: 'huawei-l7', sortOrder: 7, title: 'OSPF路由配置', type: 'TOPOLOGY', posX: 450, posY: 400, prerequisites: ['huawei-l4', 'huawei-l5'] },
    { id: 'huawei-l8', sortOrder: 8, title: '故障排查实战', type: 'SCENARIO', posX: 650, posY: 370, prerequisites: ['huawei-l5'] },
  ],
  'sangfor-hci': [
    { id: 'sangfor-l1', sortOrder: 1, title: '超融合架构概述', type: 'QUIZ', posX: 200, posY: 100, prerequisites: [], demoStatus: 'PASSED', demoStars: 2 },
    { id: 'sangfor-l2', sortOrder: 2, title: 'aSAN分布式存储', type: 'QUIZ', posX: 400, posY: 80, prerequisites: ['sangfor-l1'], demoStatus: 'PASSED', demoStars: 3 },
    { id: 'sangfor-l3', sortOrder: 3, title: '虚拟机创建与调度', type: 'TOPOLOGY', posX: 600, posY: 120, prerequisites: ['sangfor-l1', 'sangfor-l2'], demoStatus: 'UNLOCKED' },
    { id: 'sangfor-l4', sortOrder: 4, title: '网络虚拟化配置', type: 'TOPOLOGY', posX: 350, posY: 250, prerequisites: ['sangfor-l2'], demoStatus: 'UNLOCKED' },
    { id: 'sangfor-l5', sortOrder: 5, title: 'HCI命令行管理', type: 'TERMINAL', posX: 550, posY: 230, prerequisites: ['sangfor-l3', 'sangfor-l4'] },
    { id: 'sangfor-l6', sortOrder: 6, title: '高可用与故障迁移', type: 'SCENARIO', posX: 200, posY: 380, prerequisites: ['sangfor-l3'] },
    { id: 'sangfor-l7', sortOrder: 7, title: '备份与容灾策略', type: 'QUIZ', posX: 450, posY: 400, prerequisites: ['sangfor-l5'] },
    { id: 'sangfor-l8', sortOrder: 8, title: '超融合故障排查', type: 'SCENARIO', posX: 650, posY: 370, prerequisites: ['sangfor-l6', 'sangfor-l7'] },
  ],
  'anchao-cloud': [
    { id: 'anchao-l1', sortOrder: 1, title: '安超云平台概述', type: 'QUIZ', posX: 200, posY: 100, prerequisites: [], demoStatus: 'PASSED', demoStars: 3 },
    { id: 'anchao-l2', sortOrder: 2, title: '云主机生命周期', type: 'ORDERING', posX: 400, posY: 80, prerequisites: ['anchao-l1'], demoStatus: 'UNLOCKED' },
    { id: 'anchao-l3', sortOrder: 3, title: '存储池与卷管理', type: 'QUIZ', posX: 600, posY: 120, prerequisites: ['anchao-l1'], demoStatus: 'UNLOCKED' },
    { id: 'anchao-l4', sortOrder: 4, title: '虚拟网络配置', type: 'TOPOLOGY', posX: 350, posY: 250, prerequisites: ['anchao-l2', 'anchao-l3'] },
    { id: 'anchao-l5', sortOrder: 5, title: '安超云CLI操作', type: 'TERMINAL', posX: 550, posY: 230, prerequisites: ['anchao-l3'] },
    { id: 'anchao-l6', sortOrder: 6, title: '资源调度策略', type: 'MATCHING', posX: 200, posY: 380, prerequisites: ['anchao-l4'] },
    { id: 'anchao-l7', sortOrder: 7, title: '监控与告警配置', type: 'SCENARIO', posX: 450, posY: 400, prerequisites: ['anchao-l4', 'anchao-l5'] },
    { id: 'anchao-l8', sortOrder: 8, title: '云平台故障演练', type: 'SCENARIO', posX: 650, posY: 370, prerequisites: ['anchao-l6', 'anchao-l7'] },
  ],
};

// Play content for each course/level type (matches play-content.ts)
const PLAY_CONTENT: Record<string, Record<string, object>> = {
  'huawei-hcia-datacom': {
    'huawei-l1': {
      type: 'single_choice',
      content: '在华为交换机上创建VLAN 10的正确命令是？',
      options: [{ id: 'a', text: 'vlan 10' }, { id: 'b', text: 'create vlan 10' }, { id: 'c', text: 'add vlan 10' }, { id: 'd', text: 'set vlan 10' }],
      correctOptionIds: ['a'], explanation: '在VRP系统视图下直接输入 vlan 10',
      difficulty: 'beginner', knowledgePointTags: ['VLAN', 'VRP命令'],
    },
    'huawei-l2': {
      type: 'single_choice',
      content: 'OSI模型第三层是？',
      options: [{ id: 'a', text: '传输层' }, { id: 'b', text: '网络层' }, { id: 'c', text: '数据链路层' }, { id: 'd', text: '会话层' }],
      correctOptionIds: ['b'], explanation: 'OSI第三层是网络层(Network Layer)，负责路由和转发',
      difficulty: 'beginner', knowledgePointTags: ['OSI', '网络层'],
    },
    'huawei-l3': {
      type: 'matching',
      content: '将OSI模型层级与协议配对',
      leftItems: [{ id: 'l1', text: '应用层' }, { id: 'l2', text: '传输层' }, { id: 'l3', text: '网络层' }],
      rightItems: [{ id: 'r1', text: 'HTTP/FTP' }, { id: 'r2', text: 'TCP/UDP' }, { id: 'r3', text: 'IP/ICMP' }],
      correctPairs: [['l1', 'r1'], ['l2', 'r2'], ['l3', 'r3']],
      explanation: 'OSI模型各层对应不同协议族',
    },
    'huawei-l4': {
      type: 'topology',
      task: '完成VLAN10的正确连线使PC1能访问Server',
      nodes: [
        { id: 'pc1', type: 'pc', label: 'PC1', x: 120, y: 150, ports: [{ id: 'pc1-p1', label: 'eth0' }] },
        { id: 'sw1', type: 'switch', label: 'SW1', x: 400, y: 150, ports: [{ id: 'sw1-p1', label: 'G0/0/1' }, { id: 'sw1-p2', label: 'G0/0/2' }] },
        { id: 'srv1', type: 'server', label: 'Server', x: 680, y: 150, ports: [{ id: 'srv1-p1', label: 'eth0' }] },
      ],
      edges: [
        { id: 'c1', fromPortId: 'pc1-p1', toPortId: 'sw1-p1', visible: true },
        { id: 'c2', fromPortId: 'sw1-p2', toPortId: 'srv1-p1', visible: true },
      ],
      correctConnections: [{ fromPortId: 'pc1-p1', toPortId: 'sw1-p1' }, { fromPortId: 'sw1-p2', toPortId: 'srv1-p1' }],
      packetPath: ['pc1-p1', 'sw1-p1', 'sw1-p2', 'srv1-p1'],
      explanation: 'PC1通过SW1的VLAN10端口连接到Server',
    },
    'huawei-l5': {
      type: 'terminal',
      scenario: '配置SW1的Trunk端口允许VLAN 10通过',
      terminalLines: [
        { prompt: '<SW1>', command: 'system-view' },
        { prompt: '[SW1]', command: 'interface GigabitEthernet 0/0/1' },
        { prompt: '[SW1-GigabitEthernet0/0/1]', command: 'port link-type trunk' },
      ],
      blankCommands: [{ prompt: '[SW1-GigabitEthernet0/0/1]', answer: 'port trunk allow-pass vlan 10', hints: ['port', 'trunk'], fuzzyMatch: true }],
      successOutput: '配置成功！Trunk端口已允许VLAN 10通过',
      explanation: 'Trunk端口需要显式允许VLAN通过',
    },
    'huawei-l6': {
      type: 'single_choice',
      content: 'STP的根桥选举依据是？',
      options: [{ id: 'a', text: '最小Bridge ID' }, { id: 'b', text: '最大端口号' }, { id: 'c', text: '最大MAC地址' }, { id: 'd', text: '最小IP地址' }],
      correctOptionIds: ['a'], explanation: 'STP根桥选举基于最小Bridge ID (Priority + MAC)',
      difficulty: 'intermediate', knowledgePointTags: ['STP', '根桥', '选举'],
    },
    'huawei-l7': {
      type: 'topology',
      task: '配置OSPF使R1和R2建立邻居关系',
      nodes: [
        { id: 'r1', type: 'router', label: 'R1', x: 200, y: 150, ports: [{ id: 'r1-p1', label: 'G0/0/0' }] },
        { id: 'r2', type: 'router', label: 'R2', x: 600, y: 150, ports: [{ id: 'r2-p1', label: 'G0/0/0' }] },
      ],
      edges: [{ id: 'c1', fromPortId: 'r1-p1', toPortId: 'r2-p1', visible: true }],
      correctConnections: [{ fromPortId: 'r1-p1', toPortId: 'r2-p1' }],
      packetPath: ['r1-p1', 'r2-p1'],
      explanation: '两台路由器通过直连链路建立OSPF邻居',
    },
    'huawei-l8': {
      type: 'scenario',
      opening: '客户反映分公司网络间歇性中断，你被派往现场排查',
      steps: [
        { id: 'step1', narrative: '你到达现场，先进行初步诊断', choices: [
          { id: 'c1', text: 'display interface brief', resultOutput: '所有端口 UP/UP', nextStepId: 'step2', isOptimal: true },
          { id: 'c2', text: '重启交换机', resultOutput: '问题暂时消失，但10分钟后复现', nextStepId: null, isOptimal: false },
        ]},
        { id: 'step2', narrative: '端口正常，继续检查路由表', choices: [
          { id: 'c3', text: 'display ip routing-table', resultOutput: '发现缺少到总部的路由', nextStepId: null, isOptimal: true },
          { id: 'c4', text: 'display arp', resultOutput: 'ARP表正常', nextStepId: null, isOptimal: false },
        ]},
      ],
      optimalPath: ['step1', 'step2'],
      explanation: '应先检查接口状态，再检查路由表',
    },
  },
  'sangfor-hci': {
    'sangfor-l1': {
      type: 'single_choice',
      content: '深信服HCI超融合的分布式存储引擎名称是？',
      options: [{ id: 'a', text: 'aSAN' }, { id: 'b', text: 'vSAN' }, { id: 'c', text: 'ZBS' }, { id: 'd', text: 'Ceph' }],
      correctOptionIds: ['a'], explanation: '深信服自研aSAN分布式存储引擎',
      difficulty: 'beginner', knowledgePointTags: ['aSAN', 'HCI', '存储'],
    },
    'sangfor-l2': {
      type: 'single_choice',
      content: 'aSAN存储中数据副本数默认为几份？',
      options: [{ id: 'a', text: '1副本' }, { id: 'b', text: '2副本' }, { id: 'c', text: '3副本' }, { id: 'd', text: '4副本' }],
      correctOptionIds: ['c'], explanation: 'aSAN默认三副本策略',
      difficulty: 'intermediate', knowledgePointTags: ['aSAN', '副本策略'],
    },
    'sangfor-l3': {
      type: 'vm_placement',
      task: '将新业务VM调度到资源最优的HCI节点',
      clusterNodes: [
        { id: 'n1', label: 'HCI-01', cpuTotal: 64, cpuUsed: 20, memoryTotalGB: 512, memoryUsedGB: 128, storageTotalTB: 20, storageUsedTB: 5, status: 'healthy', x: 150, y: 120 },
        { id: 'n2', label: 'HCI-02', cpuTotal: 64, cpuUsed: 55, memoryTotalGB: 512, memoryUsedGB: 480, storageTotalTB: 20, storageUsedTB: 16, status: 'warning', x: 400, y: 120 },
        { id: 'n3', label: 'HCI-03', cpuTotal: 64, cpuUsed: 30, memoryTotalGB: 512, memoryUsedGB: 200, storageTotalTB: 20, storageUsedTB: 8, status: 'healthy', x: 650, y: 120 },
      ],
      vms: [
        { id: 'vm1', name: 'ERP-Server', cpuCores: 8, memoryGB: 32, storageSizeGB: 500, nodeId: 'n1', status: 'running' },
        { id: 'vm2', name: 'OA-System', cpuCores: 4, memoryGB: 16, storageSizeGB: 200, nodeId: '', status: 'stopped' },
      ],
      explanation: 'HCI-01和HCI-03资源充足，HCI-02已满载',
    },
    'sangfor-l4': {
      type: 'topology',
      task: '完成深信服HCI三节点集群的网络连线',
      nodes: [
        { id: 'node1', type: 'server', label: 'HCI-01', x: 120, y: 120, ports: [{ id: 'n1-mgmt', label: 'Mgmt' }, { id: 'n1-stor', label: 'Storage' }] },
        { id: 'node2', type: 'server', label: 'HCI-02', x: 400, y: 120, ports: [{ id: 'n2-mgmt', label: 'Mgmt' }, { id: 'n2-stor', label: 'Storage' }] },
        { id: 'node3', type: 'server', label: 'HCI-03', x: 680, y: 120, ports: [{ id: 'n3-mgmt', label: 'Mgmt' }, { id: 'n3-stor', label: 'Storage' }] },
        { id: 'sw1', type: 'switch', label: '管理交换机', x: 400, y: 280, ports: [{ id: 'sw1-p1', label: 'P1' }, { id: 'sw1-p2', label: 'P2' }, { id: 'sw1-p3', label: 'P3' }] },
      ],
      edges: [
        { id: 'c1', fromPortId: 'n1-mgmt', toPortId: 'sw1-p1', visible: true },
        { id: 'c2', fromPortId: 'n2-mgmt', toPortId: 'sw1-p2', visible: true },
        { id: 'c3', fromPortId: 'n3-mgmt', toPortId: 'sw1-p3', visible: true },
      ],
      correctConnections: [
        { fromPortId: 'n1-mgmt', toPortId: 'sw1-p1' },
        { fromPortId: 'n2-mgmt', toPortId: 'sw1-p2' },
        { fromPortId: 'n3-mgmt', toPortId: 'sw1-p3' },
      ],
      packetPath: ['n1-mgmt', 'sw1-p1', 'sw1-p2', 'n2-mgmt'],
      explanation: '三台HCI节点管理网口都连接到管理交换机',
    },
    'sangfor-l5': {
      type: 'terminal',
      scenario: '通过CLI查看深信服HCI集群状态',
      terminalLines: [
        { prompt: 'admin@HCI-01:~$', command: 'sangfor-cli cluster status' },
        { prompt: 'admin@HCI-01:~$', command: 'sangfor-cli storage pool list' },
      ],
      blankCommands: [{ prompt: 'admin@HCI-01:~$', answer: 'sangfor-cli vm list --all', hints: ['sangfor-cli', 'vm'], fuzzyMatch: true }],
      successOutput: '查询成功！共3台虚拟机正在运行',
      explanation: '使用 sangfor-cli vm list 命令查看所有虚拟机状态',
    },
    'sangfor-l6': {
      type: 'scenario',
      opening: '客户报告HCI集群中一台节点异常离线，业务虚拟机不可用',
      steps: [
        { id: 'step1', narrative: '首先确认集群整体状态', choices: [
          { id: 'c1', text: '登录aCMP查看集群健康状态', resultOutput: 'Node-02状态异常，2台VM已触发HA迁移', nextStepId: 'step2', isOptimal: true },
          { id: 'c2', text: '直接重启故障节点', resultOutput: '节点重启中，可能数据不一致', nextStepId: null, isOptimal: false },
        ]},
        { id: 'step2', narrative: 'HA已触发，检查迁移后VM状态', choices: [
          { id: 'c3', text: '检查迁移后VM运行状态和存储连通性', resultOutput: '所有VM正常，aSAN自动重建副本中', nextStepId: null, isOptimal: true },
          { id: 'c4', text: '手动迁移所有VM到单一节点', resultOutput: '资源不足，部分VM无法迁移', nextStepId: null, isOptimal: false },
        ]},
      ],
      optimalPath: ['step1', 'step2'],
      explanation: '先通过管理平台确认状态和HA迁移结果',
    },
    'sangfor-l7': {
      type: 'single_choice',
      content: '深信服HCI的快照功能属于哪个组件？',
      options: [{ id: 'a', text: 'aSAN存储引擎' }, { id: 'b', text: '网络虚拟化' }, { id: 'c', text: 'aCMP管理平台' }, { id: 'd', text: '安全组件' }],
      correctOptionIds: ['a'], explanation: '快照功能由aSAN存储引擎提供',
      difficulty: 'intermediate', knowledgePointTags: ['快照', 'aSAN', '备份'],
    },
    'sangfor-l8': {
      type: 'scenario',
      opening: '客户报告虚拟机IO延迟突然增大',
      steps: [
        { id: 'step1', narrative: '排查存储性能问题', choices: [
          { id: 'c1', text: '查看aSAN存储池健康状态和IO统计', resultOutput: '发现一块SSD出现坏块，正在数据重建', nextStepId: null, isOptimal: true },
          { id: 'c2', text: '重启所有存储节点', resultOutput: '操作风险极高，可能导致数据丢失', nextStepId: null, isOptimal: false },
        ]},
      ],
      optimalPath: ['step1'],
      explanation: '应通过监控面板定位具体故障盘',
    },
  },
  'anchao-cloud': {
    'anchao-l1': {
      type: 'single_choice',
      content: '安超云OS的虚拟化底座基于哪项技术？',
      options: [{ id: 'a', text: 'KVM + QEMU' }, { id: 'b', text: 'Xen' }, { id: 'c', text: 'Hyper-V' }, { id: 'd', text: 'ESXi' }],
      correctOptionIds: ['a'], explanation: '安超云OS基于KVM+QEMU虚拟化技术栈',
      difficulty: 'beginner', knowledgePointTags: ['KVM', '虚拟化', '安超云'],
    },
    'anchao-l2': {
      type: 'ordering',
      content: '排列安超云主机创建的操作步骤',
      steps: [
        { id: 's1', text: '选择可用域与宿主机集群' },
        { id: 's2', text: '配置CPU和内存规格' },
        { id: 's3', text: '选择系统盘镜像' },
        { id: 's4', text: '配置虚拟网络与安全组' },
        { id: 's5', text: '确认配置并创建云主机' },
      ],
      correctOrder: ['s1', 's2', 's3', 's4', 's5'],
      explanation: '创建云主机流程：选域→配规格→选镜像→配网络→确认创建',
    },
    'anchao-l3': {
      type: 'single_choice',
      content: '安超云存储池支持的后端类型不包括？',
      options: [{ id: 'a', text: '本地磁盘' }, { id: 'b', text: 'Ceph分布式存储' }, { id: 'c', text: 'NFS共享存储' }, { id: 'd', text: 'AWS S3对象存储' }],
      correctOptionIds: ['d'], explanation: '安超云不直接支持AWS S3作为块存储后端',
      difficulty: 'intermediate', knowledgePointTags: ['存储池', 'Ceph', '后端类型'],
    },
    'anchao-l4': {
      type: 'topology',
      task: '配置安超云虚拟网络：将云主机连入业务子网',
      nodes: [
        { id: 'vm1', type: 'vm', label: 'Web-VM', x: 120, y: 150, ports: [{ id: 'vm1-p1', label: 'vNIC0' }] },
        { id: 'vsw', type: 'switch', label: '虚拟交换机', x: 400, y: 150, ports: [{ id: 'vsw-p1', label: 'port1' }, { id: 'vsw-p2', label: 'port2' }] },
        { id: 'gw', type: 'router', label: '虚拟路由器', x: 680, y: 150, ports: [{ id: 'gw-p1', label: 'eth0' }] },
      ],
      edges: [
        { id: 'c1', fromPortId: 'vm1-p1', toPortId: 'vsw-p1', visible: true },
        { id: 'c2', fromPortId: 'vsw-p2', toPortId: 'gw-p1', visible: true },
      ],
      correctConnections: [{ fromPortId: 'vm1-p1', toPortId: 'vsw-p1' }, { fromPortId: 'vsw-p2', toPortId: 'gw-p1' }],
      packetPath: ['vm1-p1', 'vsw-p1', 'vsw-p2', 'gw-p1'],
      explanation: '云主机通过虚拟交换机接入业务子网',
    },
    'anchao-l5': {
      type: 'terminal',
      scenario: '通过安超云CLI查看云主机列表',
      terminalLines: [
        { prompt: 'admin@anchao:~$', command: 'anchao-cli auth login --user admin' },
        { prompt: 'admin@anchao:~$', command: 'anchao-cli compute list' },
      ],
      blankCommands: [{ prompt: 'admin@anchao:~$', answer: 'anchao-cli volume create --size 100 --name data-vol', hints: ['anchao-cli', 'volume', 'create'], fuzzyMatch: true }],
      successOutput: '云硬盘 data-vol (100GB) 创建成功！',
      explanation: '使用 anchao-cli volume create 命令创建云硬盘',
    },
    'anchao-l6': {
      type: 'matching',
      content: '将安超云资源调度策略与其场景配对',
      leftItems: [{ id: 'l1', text: '均衡调度' }, { id: 'l2', text: '亲和性策略' }, { id: 'l3', text: '反亲和性策略' }],
      rightItems: [{ id: 'r1', text: '负载均匀分布' }, { id: 'r2', text: '主备VM同节点' }, { id: 'r3', text: '高可用分散部署' }],
      correctPairs: [['l1', 'r1'], ['l2', 'r2'], ['l3', 'r3']],
      explanation: '均衡调度均匀分配资源，亲和性让相关VM就近部署',
    },
    'anchao-l7': {
      type: 'scenario',
      opening: '运维监控显示某宿主机CPU使用率持续超过95%',
      steps: [
        { id: 'step1', narrative: '首先定位高负载原因', choices: [
          { id: 'c1', text: '查看该宿主机上的VM资源使用详情', resultOutput: '发现一台数据库VM占用了60%CPU', nextStepId: 'step2', isOptimal: true },
          { id: 'c2', text: '直接热迁移所有VM', resultOutput: '迁移过程消耗更多资源', nextStepId: null, isOptimal: false },
        ]},
        { id: 'step2', narrative: '确认问题VM后，选择处置方案', choices: [
          { id: 'c3', text: '在线热迁移该VM到空闲宿主机', resultOutput: '迁移成功，CPU降至40%', nextStepId: null, isOptimal: true },
          { id: 'c4', text: '直接给宿主机扩容CPU', resultOutput: '需要停机维护', nextStepId: null, isOptimal: false },
        ]},
      ],
      optimalPath: ['step1', 'step2'],
      explanation: '先定位问题VM，再通过热迁移实现负载均衡',
    },
    'anchao-l8': {
      type: 'scenario',
      opening: '安超云平台控制节点异常，Web管理面板无法访问',
      steps: [
        { id: 'step1', narrative: '排查控制面问题', choices: [
          { id: 'c1', text: '检查控制节点服务状态', resultOutput: 'API服务已停止', nextStepId: null, isOptimal: true },
          { id: 'c2', text: '重装控制节点', resultOutput: '操作过于激进', nextStepId: null, isOptimal: false },
        ]},
      ],
      optimalPath: ['step1'],
      explanation: '先检查服务状态再决定恢复措施',
    },
  },
};

// Leaderboard mock users per course
const LEADERBOARD_USERS: Record<string, Array<{ name: string; score: number; stars: number; streakDays: number }>> = {
  'huawei-hcia-datacom': [
    { name: '王磊', score: 12500, stars: 24, streakDays: 15 },
    { name: '李明', score: 11800, stars: 22, streakDays: 12 },
    { name: '张三', score: 11200, stars: 21, streakDays: 10 },
    { name: '赵燕', score: 9800, stars: 18, streakDays: 8 },
    { name: '孙涛', score: 8900, stars: 15, streakDays: 5 },
    { name: '吴芳', score: 8200, stars: 14, streakDays: 4 },
    { name: '陈刚', score: 7500, stars: 12, streakDays: 3 },
  ],
  'sangfor-hci': [
    { name: '刘洋', score: 10800, stars: 20, streakDays: 12 },
    { name: '张伟', score: 9900, stars: 18, streakDays: 9 },
    { name: '黄丽', score: 8500, stars: 14, streakDays: 6 },
    { name: '林峰', score: 7800, stars: 12, streakDays: 5 },
    { name: '何静', score: 7100, stars: 10, streakDays: 3 },
  ],
  'anchao-cloud': [
    { name: '陈志', score: 8500, stars: 16, streakDays: 10 },
    { name: '杨帆', score: 7200, stars: 12, streakDays: 6 },
    { name: '徐亮', score: 6500, stars: 10, streakDays: 4 },
    { name: '马蓉', score: 5900, stars: 8, streakDays: 3 },
  ],
};

async function main() {
  console.log('🌱 开始填充 SkillQuest 数据库...\n');

  // 1. 创建默认租户
  const tenant = await prisma.tenant.upsert({
    where: { name: 'SkillQuest Demo' },
    update: {},
    create: {
      name: 'SkillQuest Demo',
      domain: 'demo.skillquest.dev',
      plan: 'PRO',
      maxUsers: 100,
    },
  });
  console.log(`✅ 租户: ${tenant.name} (${tenant.id})`);

  // 2. 创建演示用户
  const hashedPassword = await bcrypt.hash('password', 10);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@skillquest.dev' },
    update: {},
    create: {
      email: 'demo@skillquest.dev',
      password: hashedPassword,
      displayName: '周伟',
      tenantId: tenant.id,
      role: 'LEARNER',
      xp: 2880,
      totalStars: 16,
    },
  });
  console.log(`✅ 演示用户: ${demoUser.displayName} (${demoUser.email})`);

  // 3. 创建排行榜用户
  const leaderboardUsers: Record<string, string[]> = {};
  for (const [courseId, users] of Object.entries(LEADERBOARD_USERS)) {
    leaderboardUsers[courseId] = [];
    for (const u of users) {
      const email = `${u.name.toLowerCase().replace(/\s/g, '')}@demo.skillquest.dev`;
      const user = await prisma.user.upsert({
        where: { email },
        update: { totalStars: u.stars },
        create: {
          email,
          password: hashedPassword,
          displayName: u.name,
          tenantId: tenant.id,
          role: 'LEARNER',
          xp: u.score,
          totalStars: u.stars,
        },
      });
      leaderboardUsers[courseId].push(user.id);
    }
  }
  console.log('✅ 排行榜用户创建完成');

  // 4. 创建课程和关卡
  for (const courseData of COURSES_DATA) {
    const course = await prisma.course.upsert({
      where: { id: courseData.id },
      update: { title: courseData.title },
      create: {
        id: courseData.id,
        tenantId: tenant.id,
        title: courseData.title,
        description: courseData.description,
        vendor: courseData.vendor,
        category: courseData.category,
      },
    });
    console.log(`\n📚 课程: ${course.title}`);

    const levels = LEVELS_DATA[courseData.id] ?? [];
    const content = PLAY_CONTENT[courseData.id] ?? {};

    for (const levelData of levels) {
      const level = await prisma.level.upsert({
        where: { id: levelData.id },
        update: {
          title: levelData.title,
          content: (content[levelData.id] ?? {}) as object,
        },
        create: {
          id: levelData.id,
          courseId: courseData.id,
          sortOrder: levelData.sortOrder,
          title: levelData.title,
          type: levelData.type,
          timeLimitSec: 300,
          prerequisites: levelData.prerequisites,
          positionX: levelData.posX,
          positionY: levelData.posY,
          content: (content[levelData.id] ?? {}) as object,
        },
      });
      console.log(`   🎯 关卡 ${levelData.sortOrder}: ${level.title} (${levelData.type})`);

      // Create demo user progress
      if (levelData.demoStatus) {
        await prisma.userProgress.upsert({
          where: { userId_levelId: { userId: demoUser.id, levelId: level.id } },
          update: { status: levelData.demoStatus as 'PASSED' | 'UNLOCKED', stars: levelData.demoStars ?? 0 },
          create: {
            userId: demoUser.id,
            levelId: level.id,
            status: levelData.demoStatus as 'PASSED' | 'UNLOCKED',
            stars: levelData.demoStars ?? 0,
            bestScore: (levelData.demoStars ?? 0) * 350,
            attempts: levelData.demoStatus === 'PASSED' ? 1 : 0,
          },
        });
      }
    }

    // Create score records for leaderboard users
    const courseUsers = leaderboardUsers[courseData.id] ?? [];
    const courseLevels = LEVELS_DATA[courseData.id] ?? [];
    for (let i = 0; i < courseUsers.length; i++) {
      const userId = courseUsers[i];
      const userData = LEADERBOARD_USERS[courseData.id][i];
      // Distribute total score across first few levels
      const passedLevels = courseLevels.slice(0, Math.min(3 + i, courseLevels.length));
      const scorePerLevel = Math.floor(userData.score / passedLevels.length);
      for (const lvl of passedLevels) {
        await prisma.score.create({
          data: {
            userId,
            levelId: lvl.id,
            baseScore: Math.floor(scorePerLevel * 0.6),
            timeBonus: Math.floor(scorePerLevel * 0.2),
            comboBonus: Math.floor(scorePerLevel * 0.2),
            totalScore: scorePerLevel,
            stars: Math.min(3, Math.max(1, Math.ceil(scorePerLevel / 1500))),
          },
        });
      }
    }
  }

  // Also create scores for demo user
  for (const courseData of COURSES_DATA) {
    const levels = LEVELS_DATA[courseData.id] ?? [];
    for (const lvl of levels) {
      if (lvl.demoStatus === 'PASSED') {
        await prisma.score.create({
          data: {
            userId: demoUser.id,
            levelId: lvl.id,
            baseScore: (lvl.demoStars ?? 1) * 200,
            timeBonus: (lvl.demoStars ?? 1) * 80,
            comboBonus: (lvl.demoStars ?? 1) * 70,
            totalScore: (lvl.demoStars ?? 1) * 350,
            stars: lvl.demoStars ?? 1,
          },
        });
      }
    }
  }

  console.log('\n\n🎮 数据库填充完成！');
  console.log('─'.repeat(50));
  console.log('📧 演示登录: demo@skillquest.dev / password');
  console.log('🌐 API地址: http://localhost:3001/api');
  console.log('─'.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Seed 失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
