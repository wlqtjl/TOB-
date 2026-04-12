/**
 * Play-mode content per course per type — single-tenant B2B (SmartX demo)
 *
 * Each course provides demo content for all 7 game types.
 * The universal play page loads content by: courseId + type + id
 */

type ContentMap = Record<string, Record<string, Record<string, unknown>>>;

// ─── SmartX HALO 超融合部署 — shared detailed content ──────────────

const SMARTX_HALO_CONTENT: Record<string, Record<string, unknown>> = {
  topology: {
    id: 'topo-smartx', levelId: 'l5', type: 'topology',
    task: '完成 SmartX HALO 三节点集群网络拓扑连线 (管理网+存储网)',
    nodes: [
      { id: 'halo1', type: 'server', label: 'HALO-01', x: 120, y: 100, ports: [{ id: 'h1-mgmt', label: 'Mgmt' }, { id: 'h1-zbs', label: 'ZBS' }] },
      { id: 'halo2', type: 'server', label: 'HALO-02', x: 400, y: 100, ports: [{ id: 'h2-mgmt', label: 'Mgmt' }, { id: 'h2-zbs', label: 'ZBS' }] },
      { id: 'halo3', type: 'server', label: 'HALO-03', x: 680, y: 100, ports: [{ id: 'h3-mgmt', label: 'Mgmt' }, { id: 'h3-zbs', label: 'ZBS' }] },
      { id: 'sw-mgmt', type: 'switch', label: 'Mgmt Switch', x: 250, y: 280, ports: [{ id: 'sm-p1', label: 'P1' }, { id: 'sm-p2', label: 'P2' }, { id: 'sm-p3', label: 'P3' }] },
      { id: 'sw-stor', type: 'switch', label: 'Storage Switch', x: 550, y: 280, ports: [{ id: 'ss-p1', label: 'P1' }, { id: 'ss-p2', label: 'P2' }, { id: 'ss-p3', label: 'P3' }] },
    ],
    edges: [
      { id: 'c1', fromPortId: 'h1-mgmt', toPortId: 'sm-p1', visible: true },
      { id: 'c2', fromPortId: 'h2-mgmt', toPortId: 'sm-p2', visible: true },
      { id: 'c3', fromPortId: 'h3-mgmt', toPortId: 'sm-p3', visible: true },
      { id: 'c4', fromPortId: 'h1-zbs', toPortId: 'ss-p1', visible: true },
      { id: 'c5', fromPortId: 'h2-zbs', toPortId: 'ss-p2', visible: true },
      { id: 'c6', fromPortId: 'h3-zbs', toPortId: 'ss-p3', visible: true },
    ],
    correctConnections: [
      { fromPortId: 'h1-mgmt', toPortId: 'sm-p1' }, { fromPortId: 'h2-mgmt', toPortId: 'sm-p2' }, { fromPortId: 'h3-mgmt', toPortId: 'sm-p3' },
      { fromPortId: 'h1-zbs', toPortId: 'ss-p1' }, { fromPortId: 'h2-zbs', toPortId: 'ss-p2' }, { fromPortId: 'h3-zbs', toPortId: 'ss-p3' },
    ],
    packetPath: ['h1-zbs', 'ss-p1', 'ss-p2', 'h2-zbs'],
    explanation: 'HALO 集群需要独立的管理网络和 ZBS 存储网络，25GbE 存储网保障 IO 性能',
  },
  matching: {
    id: 'match-smartx', levelId: 'l6', type: 'matching',
    content: '将 SmartX 产品组件与其核心功能配对',
    leftItems: [{ id: 'l1', text: 'ZBS' }, { id: 'l2', text: 'ELF' }, { id: 'l3', text: 'CloudTower' }, { id: 'l4', text: 'SMTX OS' }],
    rightItems: [{ id: 'r1', text: '分布式块存储引擎' }, { id: 'r2', text: 'KVM 虚拟化平台' }, { id: 'r3', text: '统一集群管理平台' }, { id: 'r4', text: '超融合操作系统' }],
    correctPairs: [['l1', 'r1'], ['l2', 'r2'], ['l3', 'r3'], ['l4', 'r4']],
    explanation: 'ZBS=存储, ELF=虚拟化, CloudTower=管理, SMTX OS=操作系统',
  },
  ordering: {
    id: 'order-smartx', levelId: 'l1', type: 'ordering',
    content: '排列 SmartX HALO 集群部署的正确步骤',
    steps: [
      { id: 's1', text: '硬件上架、网络布线 (管理网+存储网分离)' },
      { id: 's2', text: '通过 USB/PXE 安装 SMTX OS' },
      { id: 's3', text: '初始化 ZBS 存储集群 (配置存储池与副本策略)' },
      { id: 's4', text: '部署 CloudTower 管理平台' },
      { id: 's5', text: '创建 ELF 虚拟机并部署业务' },
    ],
    correctOrder: ['s1', 's2', 's3', 's4', 's5'],
    explanation: 'SmartX 部署: 硬件布线 → SMTX OS → ZBS 初始化 → CloudTower → 业务部署',
  },
  quiz: {
    id: 'quiz-smartx', levelId: 'l1', type: 'single_choice',
    content: 'SmartX 超融合的分布式块存储引擎 ZBS 的全称是？',
    options: [{ id: 'a', text: 'Zetta Block Storage' }, { id: 'b', text: 'Zero Block System' }, { id: 'c', text: 'Zone Based Storage' }, { id: 'd', text: 'ZFS Block Store' }],
    correctOptionIds: ['a'], explanation: 'ZBS = Zetta Block Storage，SmartX 自研的高性能分布式块存储',
    difficulty: 'beginner', knowledgePointTags: ['ZBS', 'SmartX', '分布式存储'],
  },
  terminal: {
    id: 'term-smartx', levelId: 'l4', type: 'terminal',
    scenario: '通过 CloudTower API 查看 HALO 集群状态',
    terminalLines: [
      { prompt: 'admin@cloudtower:~$', command: 'curl -s http://localhost:8090/v2/api/get-clusters | jq .' },
      { prompt: 'admin@cloudtower:~$', command: 'scli cluster show' },
    ],
    blankCommands: [{ prompt: 'admin@cloudtower:~$', answer: 'scli vm list --cluster halo-prod --format table', hints: ['scli', 'vm', 'list'], fuzzyMatch: true }],
    successOutput: '共 12 台 ELF 虚拟机，10 台运行中，2 台已停止',
    explanation: '使用 scli (SmartX CLI) 管理集群和虚拟机',
  },
  scenario: {
    id: 'scenario-smartx', levelId: 'l7', type: 'scenario',
    opening: 'CloudTower 告警: HALO-03 节点存储 IO 延迟飙升至 50ms，业务 VM 响应变慢',
    steps: [
      { id: 'step1', narrative: '首先通过 CloudTower 定位异常', choices: [
        { id: 'c1', text: '查看 HALO-03 的 ZBS 存储性能指标 (IOPS/延迟/带宽)', resultOutput: 'ZBS 显示: SSD 盘组 IO 饱和，数据重建中 (前日一块 SSD 故障)', nextStepId: 'step2', isOptimal: true },
        { id: 'c2', text: '直接重启 HALO-03 节点', resultOutput: '重启会中断数据重建，可能导致数据风险', nextStepId: null, isOptimal: false },
      ]},
      { id: 'step2', narrative: 'ZBS 正在自动重建副本，需要缓解 IO 压力', choices: [
        { id: 'c3', text: '通过 CloudTower 将高 IO 业务 VM 热迁移到空闲节点', resultOutput: '迁移成功，HALO-03 IO 降至 15ms，重建速度恢复正常', nextStepId: null, isOptimal: true },
        { id: 'c4', text: '限制 ZBS 重建带宽到最低', resultOutput: '重建时间从 2 小时延长到 12 小时，数据风险窗口增大', nextStepId: null, isOptimal: false },
      ]},
    ],
    optimalPath: ['step1', 'step2'],
    explanation: 'ZBS 故障重建期间应通过热迁移减轻节点 IO 负载，而非停止重建',
  },
  vm_placement: {
    id: 'vm-smartx', levelId: 'l5', type: 'vm_placement',
    task: '将数据库 VM 调度到 SmartX HALO 集群最佳节点',
    clusterNodes: [
      { id: 'n1', label: 'HALO-01 (主)', cpuTotal: 64, cpuUsed: 25, memoryTotalGB: 512, memoryUsedGB: 180, storageTotalTB: 30, storageUsedTB: 8, status: 'healthy', x: 150, y: 120 },
      { id: 'n2', label: 'HALO-02 (主)', cpuTotal: 64, cpuUsed: 50, memoryTotalGB: 512, memoryUsedGB: 420, storageTotalTB: 30, storageUsedTB: 22, status: 'warning', x: 400, y: 120 },
      { id: 'n3', label: 'HALO-03 (存储)', cpuTotal: 32, cpuUsed: 10, memoryTotalGB: 256, memoryUsedGB: 80, storageTotalTB: 60, storageUsedTB: 15, status: 'healthy', x: 650, y: 120 },
    ],
    vms: [
      { id: 'vm1', name: 'ERP-DB (Oracle)', cpuCores: 16, memoryGB: 128, storageSizeGB: 2000, nodeId: 'n1', status: 'running' },
      { id: 'vm2', name: 'Analytics-DB', cpuCores: 8, memoryGB: 64, storageSizeGB: 1000, nodeId: '', status: 'stopped' },
    ],
    explanation: 'HALO-01 CPU/内存均衡，HALO-02 已高负载，HALO-03 存储节点适合存储密集型但 CPU/内存有限',
  },
};

const PLAY_CONTENT: ContentMap = {
  // All courses under SmartX tenant share the core HALO content for demo
  // In production, each course has its own content generated by the AI engine
  'smartx-halo': SMARTX_HALO_CONTENT,
  'smartx-migration': SMARTX_HALO_CONTENT,
  'smartx-zbs': SMARTX_HALO_CONTENT,
  'smartx-cloudtower': SMARTX_HALO_CONTENT,
};

export function getPlayContent(courseId: string, type: string): Record<string, unknown> | null {
  return PLAY_CONTENT[courseId]?.[type] ?? null;
}

export function getPlayContentTypes(): Record<string, string> {
  return {
    topology: '🔗 拓扑连线',
    matching: '🔀 知识配对',
    ordering: '📋 步骤排序',
    quiz: '📝 选择题',
    terminal: '💻 命令行',
    scenario: '🔍 故障排查',
    vm_placement: '🖥️ VM调度',
  };
}
