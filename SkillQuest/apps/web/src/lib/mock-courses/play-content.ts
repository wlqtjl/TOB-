/**
 * Play-mode content per course per type — multi-vendor
 *
 * Each course provides demo content for all 7 game types.
 * The universal play page loads content by: courseId + type + id
 */

type ContentMap = Record<string, Record<string, Record<string, unknown>>>;

const PLAY_CONTENT: ContentMap = {
  // ─── 华为 HCIA ──────────────────────────────────────────────────
  'huawei-hcia-datacom': {
    topology: {
      id: 'topo-demo', levelId: 'l4', type: 'topology',
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
    matching: {
      id: 'match-demo', levelId: 'l3', type: 'matching',
      content: '将OSI模型层级与协议配对',
      leftItems: [{ id: 'l1', text: '应用层' }, { id: 'l2', text: '传输层' }, { id: 'l3', text: '网络层' }],
      rightItems: [{ id: 'r1', text: 'HTTP/FTP' }, { id: 'r2', text: 'TCP/UDP' }, { id: 'r3', text: 'IP/ICMP' }],
      correctPairs: [['l1', 'r1'], ['l2', 'r2'], ['l3', 'r3']],
      explanation: 'OSI模型各层对应不同协议族',
    },
    ordering: {
      id: 'order-demo', levelId: 'l5', type: 'ordering',
      content: '排列TCP三次握手的步骤',
      steps: [{ id: 's1', text: '客户端发送SYN' }, { id: 's2', text: '服务端返回SYN+ACK' }, { id: 's3', text: '客户端发送ACK' }],
      correctOrder: ['s1', 's2', 's3'],
      explanation: 'TCP三次握手完成后连接建立',
    },
    quiz: {
      id: 'quiz-demo', levelId: 'l1', type: 'single_choice',
      content: '在华为交换机上创建VLAN 10的正确命令是？',
      options: [{ id: 'a', text: 'vlan 10' }, { id: 'b', text: 'create vlan 10' }, { id: 'c', text: 'add vlan 10' }, { id: 'd', text: 'set vlan 10' }],
      correctOptionIds: ['a'], explanation: '在VRP系统视图下直接输入 vlan 10',
      difficulty: 'beginner', knowledgePointTags: ['VLAN', 'VRP命令'],
    },
    terminal: {
      id: 'term-demo', levelId: 'l5', type: 'terminal',
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
    scenario: {
      id: 'scenario-demo', levelId: 'l8', type: 'scenario',
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
      explanation: '应先检查接口状态，再检查路由表，确定是路由缺失导致间歇中断',
    },
    vm_placement: {
      id: 'vm-demo', levelId: 'l6', type: 'vm_placement',
      task: '将DB-VM放置到资源充足的集群节点',
      clusterNodes: [
        { id: 'n1', label: 'Node-1', cpuTotal: 32, cpuUsed: 10, memoryTotalGB: 256, memoryUsedGB: 64, storageTotalTB: 10, storageUsedTB: 3, status: 'healthy', x: 200, y: 120 },
        { id: 'n2', label: 'Node-2', cpuTotal: 32, cpuUsed: 28, memoryTotalGB: 256, memoryUsedGB: 240, storageTotalTB: 10, storageUsedTB: 8, status: 'warning', x: 500, y: 120 },
      ],
      vms: [
        { id: 'vm1', name: 'Web-VM', cpuCores: 4, memoryGB: 8, storageSizeGB: 100, nodeId: 'n1', status: 'running' },
        { id: 'vm2', name: 'DB-VM', cpuCores: 8, memoryGB: 32, storageSizeGB: 500, nodeId: '', status: 'stopped' },
      ],
      explanation: 'Node-1有足够的CPU和内存资源，Node-2已接近满载',
    },
  },

  // ─── 深信服超融合 HCI ────────────────────────────────────────────
  'sangfor-hci': {
    topology: {
      id: 'topo-sangfor', levelId: 'l4', type: 'topology',
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
      explanation: '三台HCI节点的管理网口都需要连接到管理交换机',
    },
    matching: {
      id: 'match-sangfor', levelId: 'l2', type: 'matching',
      content: '将深信服HCI组件与其功能配对',
      leftItems: [{ id: 'l1', text: 'aSAN' }, { id: 'l2', text: 'aCMP' }, { id: 'l3', text: 'aNet' }],
      rightItems: [{ id: 'r1', text: '分布式存储' }, { id: 'r2', text: '云管理平台' }, { id: 'r3', text: '网络虚拟化' }],
      correctPairs: [['l1', 'r1'], ['l2', 'r2'], ['l3', 'r3']],
      explanation: 'aSAN负责存储，aCMP负责管理，aNet负责网络虚拟化',
    },
    ordering: {
      id: 'order-sangfor', levelId: 'l1', type: 'ordering',
      content: '排列深信服HCI部署的正确步骤',
      steps: [
        { id: 's1', text: '硬件上架与网络布线' },
        { id: 's2', text: '通过U盘引导安装HCI系统' },
        { id: 's3', text: '配置管理IP并创建集群' },
        { id: 's4', text: '初始化aSAN存储池' },
        { id: 's5', text: '创建虚拟机并部署业务' },
      ],
      correctOrder: ['s1', 's2', 's3', 's4', 's5'],
      explanation: '深信服HCI安装流程：硬件→系统安装→集群→存储→业务部署',
    },
    quiz: {
      id: 'quiz-sangfor', levelId: 'l1', type: 'single_choice',
      content: '深信服HCI超融合的分布式存储引擎名称是？',
      options: [{ id: 'a', text: 'aSAN' }, { id: 'b', text: 'vSAN' }, { id: 'c', text: 'ZBS' }, { id: 'd', text: 'Ceph' }],
      correctOptionIds: ['a'], explanation: '深信服自研aSAN分布式存储引擎',
      difficulty: 'beginner', knowledgePointTags: ['aSAN', 'HCI', '存储'],
    },
    terminal: {
      id: 'term-sangfor', levelId: 'l5', type: 'terminal',
      scenario: '通过CLI查看深信服HCI集群状态',
      terminalLines: [
        { prompt: 'admin@HCI-01:~$', command: 'sangfor-cli cluster status' },
        { prompt: 'admin@HCI-01:~$', command: 'sangfor-cli storage pool list' },
      ],
      blankCommands: [{ prompt: 'admin@HCI-01:~$', answer: 'sangfor-cli vm list --all', hints: ['sangfor-cli', 'vm'], fuzzyMatch: true }],
      successOutput: '查询成功！共3台虚拟机正在运行',
      explanation: '使用 sangfor-cli vm list 命令查看所有虚拟机状态',
    },
    scenario: {
      id: 'scenario-sangfor', levelId: 'l6', type: 'scenario',
      opening: '客户报告HCI集群中一台节点异常离线，业务虚拟机不可用',
      steps: [
        { id: 'step1', narrative: '首先确认集群整体状态', choices: [
          { id: 'c1', text: '登录aCMP查看集群健康状态', resultOutput: '显示Node-02状态异常，2台VM已触发HA迁移', nextStepId: 'step2', isOptimal: true },
          { id: 'c2', text: '直接重启故障节点', resultOutput: '节点重启中，可能导致数据不一致', nextStepId: null, isOptimal: false },
        ]},
        { id: 'step2', narrative: 'HA已触发，检查迁移后VM状态', choices: [
          { id: 'c3', text: '检查迁移后VM的运行状态和存储连通性', resultOutput: '所有VM正常运行，aSAN自动重建副本中', nextStepId: null, isOptimal: true },
          { id: 'c4', text: '手动迁移所有VM到单一节点', resultOutput: '资源不足，部分VM无法迁移', nextStepId: null, isOptimal: false },
        ]},
      ],
      optimalPath: ['step1', 'step2'],
      explanation: '应先通过管理平台确认整体状态和HA迁移结果，再检查业务连续性',
    },
    vm_placement: {
      id: 'vm-sangfor', levelId: 'l3', type: 'vm_placement',
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
      explanation: 'HCI-01和HCI-03都有足够资源，HCI-02已接近满载不适合分配新VM',
    },
  },

  // ─── 安超云 OS ──────────────────────────────────────────────────
  'anchao-cloud': {
    topology: {
      id: 'topo-anchao', levelId: 'l4', type: 'topology',
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
      explanation: '云主机通过虚拟交换机接入业务子网，虚拟路由器提供网关服务',
    },
    matching: {
      id: 'match-anchao', levelId: 'l6', type: 'matching',
      content: '将安超云资源调度策略与其场景配对',
      leftItems: [{ id: 'l1', text: '均衡调度' }, { id: 'l2', text: '亲和性策略' }, { id: 'l3', text: '反亲和性策略' }],
      rightItems: [{ id: 'r1', text: '负载均匀分布' }, { id: 'r2', text: '主备VM同节点' }, { id: 'r3', text: '高可用分散部署' }],
      correctPairs: [['l1', 'r1'], ['l2', 'r2'], ['l3', 'r3']],
      explanation: '均衡调度均匀分配资源，亲和性让相关VM就近部署，反亲和性保障高可用',
    },
    ordering: {
      id: 'order-anchao', levelId: 'l2', type: 'ordering',
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
    quiz: {
      id: 'quiz-anchao', levelId: 'l1', type: 'single_choice',
      content: '安超云OS的虚拟化底座基于哪项技术？',
      options: [{ id: 'a', text: 'KVM + QEMU' }, { id: 'b', text: 'Xen' }, { id: 'c', text: 'Hyper-V' }, { id: 'd', text: 'ESXi' }],
      correctOptionIds: ['a'], explanation: '安超云OS基于KVM+QEMU虚拟化技术栈',
      difficulty: 'beginner', knowledgePointTags: ['KVM', '虚拟化', '安超云'],
    },
    terminal: {
      id: 'term-anchao', levelId: 'l5', type: 'terminal',
      scenario: '通过安超云CLI查看云主机列表',
      terminalLines: [
        { prompt: 'admin@anchao:~$', command: 'anchao-cli auth login --user admin' },
        { prompt: 'admin@anchao:~$', command: 'anchao-cli compute list' },
      ],
      blankCommands: [{ prompt: 'admin@anchao:~$', answer: 'anchao-cli volume create --size 100 --name data-vol', hints: ['anchao-cli', 'volume', 'create'], fuzzyMatch: true }],
      successOutput: '云硬盘 data-vol (100GB) 创建成功！',
      explanation: '使用 anchao-cli volume create 命令创建云硬盘',
    },
    scenario: {
      id: 'scenario-anchao', levelId: 'l7', type: 'scenario',
      opening: '运维监控显示安超云平台某宿主机CPU使用率持续超过95%',
      steps: [
        { id: 'step1', narrative: '首先定位高负载原因', choices: [
          { id: 'c1', text: '查看该宿主机上的VM资源使用详情', resultOutput: '发现一台数据库VM占用了60%CPU', nextStepId: 'step2', isOptimal: true },
          { id: 'c2', text: '直接热迁移所有VM', resultOutput: '迁移过程消耗更多资源，导致部分VM短暂不可用', nextStepId: null, isOptimal: false },
        ]},
        { id: 'step2', narrative: '确认问题VM后，选择处置方案', choices: [
          { id: 'c3', text: '在线热迁移该数据库VM到空闲宿主机', resultOutput: '迁移成功，源宿主机CPU降至40%', nextStepId: null, isOptimal: true },
          { id: 'c4', text: '直接给宿主机扩容CPU', resultOutput: '需要停机维护，影响业务', nextStepId: null, isOptimal: false },
        ]},
      ],
      optimalPath: ['step1', 'step2'],
      explanation: '先定位问题VM，再通过热迁移实现负载均衡，避免整体影响',
    },
    vm_placement: {
      id: 'vm-anchao', levelId: 'l4', type: 'vm_placement',
      task: '将新建的Web应用VM调度到最合适的宿主机',
      clusterNodes: [
        { id: 'n1', label: '宿主机-A', cpuTotal: 48, cpuUsed: 15, memoryTotalGB: 384, memoryUsedGB: 96, storageTotalTB: 15, storageUsedTB: 4, status: 'healthy', x: 150, y: 120 },
        { id: 'n2', label: '宿主机-B', cpuTotal: 48, cpuUsed: 40, memoryTotalGB: 384, memoryUsedGB: 350, storageTotalTB: 15, storageUsedTB: 12, status: 'warning', x: 400, y: 120 },
        { id: 'n3', label: '宿主机-C', cpuTotal: 48, cpuUsed: 22, memoryTotalGB: 384, memoryUsedGB: 150, storageTotalTB: 15, storageUsedTB: 6, status: 'healthy', x: 650, y: 120 },
      ],
      vms: [
        { id: 'vm1', name: 'DB-Master', cpuCores: 8, memoryGB: 32, storageSizeGB: 500, nodeId: 'n1', status: 'running' },
        { id: 'vm2', name: 'WebApp-New', cpuCores: 4, memoryGB: 8, storageSizeGB: 100, nodeId: '', status: 'stopped' },
      ],
      explanation: '宿主机-A和宿主机-C资源充足，宿主机-B已接近满载',
    },
  },
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
