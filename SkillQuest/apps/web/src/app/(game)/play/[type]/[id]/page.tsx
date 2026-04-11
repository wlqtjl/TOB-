/**
 * Universal Play Page — play/[type]/[id]/page.tsx
 *
 * Route: /play/{type}/{id}
 * - type determines which adapter to use (topology, matching, quiz, etc.)
 * - id is the level content ID
 *
 * Flow: Load content → adapter(content) → VisualScene → UniversalGameRenderer
 * All 7 level types share this single page.
 */

'use client';

import React, { useMemo, useCallback, useState } from 'react';
import type {
  TopologyQuizLevel,
  MatchingQuestion,
  OrderingQuestion,
  QuizQuestion,
  TerminalQuizLevel,
  ScenarioQuizLevel,
  VirtualizationLevel,
} from '@skillquest/types';
import type { VisualScene, InteractionResult } from '@skillquest/game-engine';
import {
  topologyAdapter,
  matchingAdapter,
  orderingAdapter,
  quizAdapter,
  terminalAdapter,
  scenarioAdapter,
  vmPlacementAdapter,
} from '@skillquest/game-engine';
import UniversalGameRenderer from '../../../../components/game/UniversalGameRenderer';
import GameHUD from '../../../../components/game/GameHUD';
import { useGameState } from '../../../../components/game/hooks/useGameState';

// ─── Mock data (will be replaced by API fetch) ─────────────────────

const MOCK_CONTENT: Record<string, Record<string, unknown>> = {
  topology: {
    id: 'topo-demo',
    levelId: 'l4',
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
    correctConnections: [
      { fromPortId: 'pc1-p1', toPortId: 'sw1-p1' },
      { fromPortId: 'sw1-p2', toPortId: 'srv1-p1' },
    ],
    packetPath: ['pc1-p1', 'sw1-p1', 'sw1-p2', 'srv1-p1'],
    explanation: 'PC1通过SW1的VLAN10端口连接到Server',
  },
  matching: {
    id: 'match-demo',
    levelId: 'l3',
    type: 'matching',
    content: '将OSI模型层级与协议配对',
    leftItems: [
      { id: 'l1', text: '应用层' },
      { id: 'l2', text: '传输层' },
      { id: 'l3', text: '网络层' },
    ],
    rightItems: [
      { id: 'r1', text: 'HTTP/FTP' },
      { id: 'r2', text: 'TCP/UDP' },
      { id: 'r3', text: 'IP/ICMP' },
    ],
    correctPairs: [['l1', 'r1'], ['l2', 'r2'], ['l3', 'r3']],
    explanation: 'OSI模型各层对应不同协议族',
  },
  ordering: {
    id: 'order-demo',
    levelId: 'l5',
    type: 'ordering',
    content: '排列TCP三次握手的步骤',
    steps: [
      { id: 's1', text: '客户端发送SYN' },
      { id: 's2', text: '服务端返回SYN+ACK' },
      { id: 's3', text: '客户端发送ACK' },
    ],
    correctOrder: ['s1', 's2', 's3'],
    explanation: 'TCP三次握手完成后连接建立',
  },
  quiz: {
    id: 'quiz-demo',
    levelId: 'l1',
    type: 'single_choice',
    content: '在华为交换机上创建VLAN 10的正确命令是？',
    options: [
      { id: 'a', text: 'vlan 10' },
      { id: 'b', text: 'create vlan 10' },
      { id: 'c', text: 'add vlan 10' },
      { id: 'd', text: 'set vlan 10' },
    ],
    correctOptionIds: ['a'],
    explanation: '在VRP系统视图下直接输入 vlan 10',
    difficulty: 'beginner',
    knowledgePointTags: ['VLAN', 'VRP命令'],
  },
  terminal: {
    id: 'term-demo',
    levelId: 'l5',
    type: 'terminal',
    scenario: '配置SW1的Trunk端口允许VLAN 10通过',
    terminalLines: [
      { prompt: '<SW1>', command: 'system-view' },
      { prompt: '[SW1]', command: 'interface GigabitEthernet 0/0/1' },
      { prompt: '[SW1-GigabitEthernet0/0/1]', command: 'port link-type trunk' },
    ],
    blankCommands: [
      { prompt: '[SW1-GigabitEthernet0/0/1]', answer: 'port trunk allow-pass vlan 10', hints: ['port', 'trunk'], fuzzyMatch: true },
    ],
    successOutput: '配置成功！Trunk端口已允许VLAN 10通过',
    explanation: 'Trunk端口需要显式允许VLAN通过',
  },
  scenario: {
    id: 'scenario-demo',
    levelId: 'l8',
    type: 'scenario',
    opening: '客户反映分公司网络间歇性中断，你被派往现场排查',
    steps: [
      {
        id: 'step1',
        narrative: '你到达现场，先进行初步诊断',
        choices: [
          { id: 'c1', text: 'display interface brief', resultOutput: '所有端口 UP/UP', nextStepId: 'step2', isOptimal: true },
          { id: 'c2', text: '重启交换机', resultOutput: '问题暂时消失，但10分钟后复现', nextStepId: null, isOptimal: false },
        ],
      },
      {
        id: 'step2',
        narrative: '端口正常，继续检查路由表',
        choices: [
          { id: 'c3', text: 'display ip routing-table', resultOutput: '发现缺少到总部的路由', nextStepId: null, isOptimal: true },
          { id: 'c4', text: 'display arp', resultOutput: 'ARP表正常', nextStepId: null, isOptimal: false },
        ],
      },
    ],
    optimalPath: ['step1', 'step2'],
    explanation: '应先检查接口状态，再检查路由表，确定是路由缺失导致间歇中断',
  },
  vm_placement: {
    id: 'vm-demo',
    levelId: 'l6',
    type: 'vm_placement',
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
};

// ─── Adapter dispatch ──────────────────────────────────────────────

type ContentType = 'topology' | 'matching' | 'ordering' | 'quiz' | 'terminal' | 'scenario' | 'vm_placement';

function adaptContent(type: ContentType, data: Record<string, unknown>): VisualScene {
  switch (type) {
    case 'topology': return topologyAdapter(data as unknown as TopologyQuizLevel);
    case 'matching': return matchingAdapter(data as unknown as MatchingQuestion);
    case 'ordering': return orderingAdapter(data as unknown as OrderingQuestion);
    case 'quiz': return quizAdapter(data as unknown as QuizQuestion);
    case 'terminal': return terminalAdapter(data as unknown as TerminalQuizLevel);
    case 'scenario': return scenarioAdapter(data as unknown as ScenarioQuizLevel);
    case 'vm_placement': return vmPlacementAdapter(data as unknown as VirtualizationLevel);
    default: throw new Error(`Unknown level type: ${type}`);
  }
}

const TYPE_LABELS: Record<string, string> = {
  topology: '🔗 拓扑连线',
  matching: '🔀 知识配对',
  ordering: '📋 步骤排序',
  quiz: '📝 选择题',
  terminal: '💻 命令行',
  scenario: '🔍 故障排查',
  vm_placement: '🖥️ VM调度',
};

// ─── Page Component ────────────────────────────────────────────────

export default function PlayPage({ params }: { params: { type: string; id: string } }) {
  const { type, id } = params;
  const contentType = type as ContentType;
  const [messages, setMessages] = useState<Array<{ text: string; correct: boolean }>>([]);

  // Load content (mock for now, will be API fetch)
  const content = MOCK_CONTENT[contentType];
  const totalQuestions = 1; // Will be dynamic from API

  const { state: gameState, answerCorrect, answerWrong } = useGameState(totalQuestions);

  // Convert content → VisualScene via adapter
  const scene = useMemo(() => {
    if (!content) return null;
    try {
      return adaptContent(contentType, content);
    } catch {
      return null;
    }
  }, [contentType, content]);

  const handleInteraction = useCallback(
    (result: InteractionResult) => {
      if (result.correct) {
        answerCorrect(id);
      } else {
        answerWrong(id);
      }
      setMessages((prev) => [
        ...prev,
        { text: result.message ?? (result.correct ? '✅ 正确！' : '❌ 错误'), correct: result.correct },
      ]);
    },
    [id, answerCorrect, answerWrong],
  );

  if (!content || !scene) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-gray-400">😕 未找到关卡内容</p>
          <p className="mt-2 text-sm text-gray-600">
            类型: {type} · ID: {id}
          </p>
          <a href="/map" className="mt-4 inline-block text-blue-400 hover:underline text-sm">
            ← 返回地图
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      {/* Header */}
      <div className="mx-auto max-w-[950px] mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-blue-300">
              {TYPE_LABELS[contentType] ?? contentType}
            </h1>
            <p className="text-xs text-gray-500">
              {scene.title} · ID: {id}
            </p>
          </div>
          <a
            href="/map"
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-500 transition"
          >
            ← 返回地图
          </a>
        </div>
      </div>

      {/* Game Canvas + HUD */}
      <div className="mx-auto max-w-[950px] relative">
        <GameHUD gameState={gameState} levelTitle={scene.title} />
        <UniversalGameRenderer
          scene={scene}
          onInteraction={handleInteraction}
          comboCount={gameState.combo.count}
          className="border border-gray-800 rounded-xl overflow-hidden mt-12"
          debug={false}
        />
      </div>

      {/* Interaction messages */}
      <div className="mx-auto max-w-[950px] mt-4 space-y-2">
        {messages.slice(-3).map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg px-4 py-2 text-sm ${
              msg.correct
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {/* Type switcher (for demo) */}
      <div className="mx-auto max-w-[950px] mt-6">
        <p className="text-xs text-gray-600 mb-2">切换关卡类型 (演示):</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <a
              key={key}
              href={`/play/${key}/demo`}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                key === contentType
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-gray-700 text-gray-500 hover:border-gray-500'
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
