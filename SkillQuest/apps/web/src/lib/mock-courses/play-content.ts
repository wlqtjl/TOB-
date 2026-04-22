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
  scenario_decision: {
    id: 'scenario-decision-smartx', levelId: 'l8', type: 'scenario_decision',
    questions: [
      {
        scenario: '🎭 张工，你接到了报警通知：\n\n"ZBS 集群中 Node-3 状态变为 WARNING，磁盘使用率达到 87%"\n\n现在是下午5点，明天早上有重要演示。你会怎么做？',
        role: '运维工程师张工',
        choices: [
          { id: 'A', text: '立即扩容存储，今晚就处理', isCorrect: false, consequence: '你尝试在线扩容，但发现当前没有空余节点可用，扩容需要新采购硬件。时间上来不及，明天演示依然面临风险。' },
          { id: 'B', text: '先设置告警阈值，明天上班再处理', isCorrect: false, consequence: '到了晚上10点，磁盘使用率飙升至 95%，触发了自动保护机制，部分业务 VM 被限制 IO，客户提前测试时发现系统卡顿。' },
          { id: 'C', text: '迁移部分数据到其他节点，释放空间', isCorrect: true, consequence: '你登录 CloudTower，选择了 Node-3 上占用最大的几个数据集，迁移到 Node-1（当前使用率：61%）。操作耗时 23 分钟，Node-3 使用率降至 64%，明天的演示顺利进行！' },
          { id: 'D', text: '忽略这条告警，87% 还不算严重', isCorrect: false, consequence: '凌晨2点，磁盘使用率突破 95% 阈值，ZBS 触发了数据保护机制，拒绝新的写入请求。客户的业务系统无法正常写入数据，第二天演示直接失败。' },
        ],
        correctRationale: '在磁盘使用率较高且时间紧迫时，迁移数据是最快速有效的方式。不中断业务，不需要新硬件。',
        knowledgePoint: '短期扩容不如迁移 — ZBS 支持在线数据迁移，不中断业务，是处理存储容量告警的首选方案。',
      },
      {
        scenario: '你刚处理完 Node-3 的告警，CloudTower 又弹出一条新消息：\n\n"ZBS 检测到 Node-2 上一块 SSD 的 SMART 状态异常，预测将在 48 小时内故障"\n\n当前集群使用 3 副本策略，Node-2 上有 200 个数据块。',
        role: '运维工程师张工',
        choices: [
          { id: 'A', text: '立即更换这块 SSD', isCorrect: false, consequence: '你申请了紧急更换，但发现备件仓库没有相同型号的 SSD。采购需要 3-5 个工作日，不能当场解决问题。' },
          { id: 'B', text: '让 ZBS 自动处理，3 副本足够安全', isCorrect: false, consequence: '虽然 3 副本确实能容忍 1 块盘故障，但如果这期间又有其他盘出问题，数据就有风险了。等到盘真的坏了再处理，中间的数据重建会给集群带来额外 IO 压力。' },
          { id: 'C', text: '先将 Node-2 标记为维护模式，让数据提前迁出', isCorrect: true, consequence: '你在 CloudTower 中将 Node-2 设为"维护模式"，ZBS 开始自动将这个节点上的数据迁移到其他健康节点。迁移在 2 小时内完成，随后安全下线更换 SSD。整个过程业务零中断！' },
          { id: 'D', text: '关闭这台服务器等待更换', isCorrect: false, consequence: '直接关机导致集群突然少了一个节点，ZBS 紧急启动数据重建。在重建期间集群性能下降 30%，客户报告业务系统变慢。' },
        ],
        correctRationale: '预防性维护是最佳实践 — 在磁盘彻底故障前，通过维护模式主动迁出数据，避免被动重建带来的性能影响。',
        knowledgePoint: '维护模式 — ZBS 支持将节点标记为"维护模式"，系统会自动将数据迁出该节点，确保数据安全后再进行硬件维护。',
      },
      {
        scenario: '周五下午，你的同事小李发现生产集群的 ZBS 副本策略是 2 副本，但公司安全规范要求生产环境必须使用 3 副本。\n\n小李问你："直接在 CloudTower 里把副本数从 2 改成 3 可以吗？会影响业务吗？"\n\n当前集群 3 个节点，存储使用率分别是 45%、52%、48%。',
        role: '高级运维工程师',
        choices: [
          { id: 'A', text: '可以直接改，ZBS 会自动增加副本，不影响业务', isCorrect: true, consequence: '你指导小李在 CloudTower 中修改存储策略为 3 副本。ZBS 开始在后台自动创建额外的副本，整个过程对业务透明。由于当前存储使用率不到 60%，有足够空间容纳额外副本。2 小时后副本策略变更完成。' },
          { id: 'B', text: '不行，必须停机后才能修改副本策略', isCorrect: false, consequence: '其实 ZBS 支持在线修改副本策略。你建议的停机方案让小李在周末加了班，而且业务中断了 4 小时，客户非常不满。' },
          { id: 'C', text: '可以改，但需要先添加新节点', isCorrect: false, consequence: '3 副本不一定需要 3 个以上节点（虽然推荐），当前 3 个节点完全可以支持 3 副本。额外采购节点浪费了预算和时间。' },
          { id: 'D', text: '建议用纠删码替代 3 副本，更省空间', isCorrect: false, consequence: '纠删码虽然省空间，但在线从 2 副本切换到纠删码比切换到 3 副本复杂得多，而且纠删码的随机读写性能不如副本。对于生产环境的关键业务，3 副本是更稳妥的选择。' },
        ],
        correctRationale: 'ZBS 支持在线修改副本策略，从 2 副本升级到 3 副本是无缝的，系统在后台自动创建额外副本。',
        knowledgePoint: 'ZBS 在线副本策略调整 — 副本数可在线变更，ZBS 会自动在后台创建/删除副本，整个过程对业务零感知。',
      },
    ],
    narrative: {
      title: 'ZBS 守护者任务',
      hook: '北京某代理商的 IDC 机房，下午5点，你正准备下班。突然 CloudTower 弹出了一连串告警...',
      protagonist: '你是一名刚入职三个月的运维工程师张工',
      missionBrief: '处理3个存储告警，确保明天的客户演示顺利进行',
      successMessage: '🎉 太棒了！你成功处理了所有告警，明天的演示将顺利进行。你的快速反应和专业判断赢得了同事的尊敬！',
      failureMessage: '💪 虽然没能全部答对，但这正是学习的过程。在真实环境中犯错的代价更高 — 好在这只是模拟！',
    },
  },
  spark_3dgs: {
    id: 'spark-smartx-migration',
    levelId: 'l9',
    type: 'spark_3dgs',
    title: 'SmartX 替换 VMware 沉浸式机房演练',
    phases: [
      {
        id: 'phase-legacy',
        phase: 'legacy',
        title: '现状扫描：VMware 传统架构',
        subtitle: '走进老旧的 VMware 机房，探索痛点',
        sceneId: 'vmware-legacy-room',
        hotspots: [
          {
            id: 'h-legacy-1',
            sceneId: 'vmware-legacy-room',
            position: { x: -2, y: 1.2, z: 3 },
            kind: 'pain-point',
            label: '陈旧存储阵列',
            description: 'IO 瓶颈：VMFS 磁盘组延迟 >20ms',
            payload: {
              question: 'VMware 传统存储的主要痛点包括？',
              options: ['IO瓶颈', '扩展困难', '许可证成本高', '管理复杂'],
              correct: [0, 1, 2, 3],
            },
          },
          {
            id: 'h-legacy-2',
            sceneId: 'vmware-legacy-room',
            position: { x: 0, y: 1.5, z: -2 },
            kind: 'quiz',
            label: 'vCenter 控制台',
            description: '点击查看传统架构问题',
            payload: {
              question: 'vSphere 许可证按什么收费？',
              options: ['CPU核数', 'VM数量', '存储容量', 'vCenter实例'],
              correct: [0],
            },
          },
          {
            id: 'h-legacy-3',
            sceneId: 'vmware-legacy-room',
            position: { x: 3, y: 0.8, z: 0 },
            kind: 'info',
            label: '扩展瓶颈提示',
            description: '增加一台 ESXi 主机需要购买整套许可证，成本高昂',
          },
        ],
        painPoints: [
          'IO 瓶颈：VMFS 延迟 >20ms',
          '扩展困难：新增主机需整套许可证',
          '许可证成本：按 CPU 核数收费昂贵',
          '管理复杂：多组件分散维护',
        ],
      },
      {
        id: 'phase-migration',
        phase: 'migration',
        title: '迁移过程：V2V 组件映射',
        subtitle: '数据从 vCenter 流向 CloudTower',
        sceneId: 'migration-in-progress',
        hotspots: [
          {
            id: 'h-migration-1',
            sceneId: 'migration-in-progress',
            position: { x: -3, y: 2, z: 0 },
            kind: 'dragdrop',
            label: 'V2V 映射任务',
            description: '将 VMware 组件映射到 SmartX 对应项',
            payload: {
              pairs: [
                { from: 'VMFS Datastore', to: 'ZBS Volume' },
                { from: 'vMotion', to: 'ELF Live Migration' },
                { from: 'vCenter', to: 'CloudTower' },
                { from: 'ESXi Host', to: 'SMTX OS Node' },
              ],
            },
          },
          {
            id: 'h-migration-2',
            sceneId: 'migration-in-progress',
            position: { x: 0, y: 1.8, z: 2 },
            kind: 'info',
            label: '迁移进度监控',
            description: '当前进度：已迁移 8/12 台虚拟机',
          },
          {
            id: 'h-migration-3',
            sceneId: 'migration-in-progress',
            position: { x: 3, y: 1.2, z: -1 },
            kind: 'quiz',
            label: 'CloudTower API',
            description: '测试迁移知识',
            payload: {
              question: 'V2V 迁移中，存储数据如何同步？',
              options: ['实时镜像', '离线拷贝', '增量同步', '快照传输'],
              correct: [2],
            },
          },
        ],
      },
      {
        id: 'phase-smartx',
        phase: 'smartx',
        title: '替换成果：SmartX 精简架构',
        subtitle: '三台机架合并为一台 HALO 节点',
        sceneId: 'smartx-minimal-rack',
        hotspots: [
          {
            id: 'h-smartx-1',
            sceneId: 'smartx-minimal-rack',
            position: { x: -1.5, y: 1.5, z: 2 },
            kind: 'comparison',
            label: 'IOPS 对比',
            description: '迁移前后性能对比',
            payload: { before: 12000, after: 68000, metric: 'IOPS' },
          },
          {
            id: 'h-smartx-2',
            sceneId: 'smartx-minimal-rack',
            position: { x: 0, y: 2, z: 0 },
            kind: 'info',
            label: 'SmartX HALO 节点',
            description: '单台 HALO 节点整合原三台机架资源',
          },
          {
            id: 'h-smartx-3',
            sceneId: 'smartx-minimal-rack',
            position: { x: 2, y: 1, z: -2 },
            kind: 'quiz',
            label: 'ZBS 性能测试',
            description: '验证替换成果',
            payload: {
              question: 'SmartX ZBS 相比 VMFS 的优势包括？',
              options: ['全闪架构', '三副本保护', 'EC纠删码', '原生NVMe'],
              correct: [0, 1, 2, 3],
            },
          },
          {
            id: 'h-smartx-4',
            sceneId: 'smartx-minimal-rack',
            position: { x: -2, y: 0.5, z: -1 },
            kind: 'info',
            label: '成本节省',
            description: '相比 VMware 方案，年度许可证成本节省 60%',
          },
        ],
      },
    ],
    successMessage: '🎉 完美！你已掌握 SmartX 替换 VMware 的全流程，从痛点识别到迁移映射再到性能验证！',
    failureMessage: '💪 继续学习！理解替换方案的关键在于熟悉两边架构的对应关系。',
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
    topology: '拓扑连线',
    matching: '知识配对',
    ordering: '步骤排序',
    quiz: '选择题',
    terminal: '命令行',
    scenario: '故障排查',
    vm_placement: 'VM调度',
    scenario_decision: '情景选择',
    spark_3dgs: '3DGS 机房演练',
  };
}
