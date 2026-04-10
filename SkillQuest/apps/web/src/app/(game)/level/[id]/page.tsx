/**
 * 关卡答题界面 — 对标 Data Center 的即时 packet 反应
 *
 * 核心体验:
 * - 答对: 爆炸粒子 + 分数飞出 + 连击计数器 + 背景闪光
 * - 答错: 震动 + 错误解析弹出
 * - 连击加成 (Combo系统)
 */

import type { QuizQuestion, QuizOption } from '@skillquest/types';

// Mock 题目: 华为 HCIA VLAN 配置
const mockQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    levelId: 'l4',
    type: 'single_choice',
    content: '在华为交换机上创建VLAN 10，正确的命令是？',
    options: [
      { id: 'a', text: 'vlan 10' },
      { id: 'b', text: 'create vlan 10' },
      { id: 'c', text: 'add vlan 10' },
      { id: 'd', text: 'set vlan 10' },
    ],
    correctOptionIds: ['a'],
    explanation: '在华为VRP系统视图下，直接输入 "vlan 10" 即可创建并进入VLAN 10视图。',
    difficulty: 'beginner',
    knowledgePointTags: ['VLAN', 'VRP命令', '交换机配置'],
  },
  {
    id: 'q2',
    levelId: 'l4',
    type: 'single_choice',
    content: 'Trunk端口默认允许通过哪些VLAN的流量？',
    options: [
      { id: 'a', text: '只允许VLAN 1' },
      { id: 'b', text: '允许所有VLAN' },
      { id: 'c', text: '不允许任何VLAN' },
      { id: 'd', text: '只允许管理VLAN' },
    ],
    correctOptionIds: ['b'],
    explanation: 'Trunk端口默认允许所有VLAN通过。可以使用 "port trunk allow-pass vlan" 命令限制。',
    difficulty: 'beginner',
    knowledgePointTags: ['Trunk', 'VLAN', '端口类型'],
  },
  {
    id: 'q3',
    levelId: 'l4',
    type: 'single_choice',
    content: '以下哪种端口类型会在发送帧时剥离VLAN标签？',
    options: [
      { id: 'a', text: 'Trunk端口' },
      { id: 'b', text: 'Hybrid端口（发送时untagged的VLAN）' },
      { id: 'c', text: 'Access端口' },
      { id: 'd', text: 'B和C都正确' },
    ],
    correctOptionIds: ['d'],
    explanation: 'Access端口发送时一定剥离标签；Hybrid端口对untagged的VLAN也会剥离标签。两者都正确。',
    difficulty: 'intermediate',
    knowledgePointTags: ['Access', 'Hybrid', 'VLAN标签'],
  },
];

/** 答题反馈组件 */
function AnswerFeedback({
  isCorrect,
  combo,
  score,
  explanation,
}: {
  isCorrect: boolean;
  combo: number;
  score: number;
  explanation: string;
}) {
  if (isCorrect) {
    return (
      <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✅</span>
          <div>
            <p className="font-bold text-green-400">回答正确！</p>
            <p className="text-sm text-gray-400">+{score} 分</p>
          </div>
          {combo >= 3 && (
            <div className="ml-auto rounded-full bg-amber-500/20 border border-amber-500 px-3 py-1 text-amber-400 font-bold">
              🔥 {combo}x COMBO!
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
      <div className="flex items-start gap-3">
        <span className="text-3xl">❌</span>
        <div>
          <p className="font-bold text-red-400">回答错误</p>
          <p className="mt-2 text-sm text-gray-300">{explanation}</p>
        </div>
      </div>
    </div>
  );
}

/** 选项按钮 */
function OptionButton({
  option,
  state,
}: {
  option: QuizOption;
  state: 'default' | 'correct' | 'wrong' | 'disabled';
}) {
  const stateStyles: Record<string, string> = {
    default: 'border-gray-700 bg-gray-800/50 hover:border-blue-500 hover:bg-blue-900/30 cursor-pointer',
    correct: 'border-green-500 bg-green-500/10',
    wrong: 'border-red-500 bg-red-500/10',
    disabled: 'border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed',
  };

  return (
    <button
      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${stateStyles[state]}`}
      disabled={state === 'disabled'}
    >
      <span className="font-mono text-sm text-gray-500 mr-2">
        {option.id.toUpperCase()}.
      </span>
      <span className={state === 'correct' ? 'text-green-400' : state === 'wrong' ? 'text-red-400' : 'text-gray-200'}>
        {option.text}
      </span>
    </button>
  );
}

export default function LevelPage({ params }: { params: { id: string } }) {
  const levelId = params.id;
  const currentQuestion = mockQuestions[0];

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* 顶部状态栏 */}
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-blue-300">关卡: VLAN配置实验</h1>
            <p className="text-xs text-gray-500">关卡 ID: {levelId} · 题目 1/3</p>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-amber-400 font-mono">🔥 0x combo</span>
            <span className="text-blue-300 font-mono">💯 0 分</span>
            <span className="text-gray-500 font-mono">⏱ 2:00</span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mb-6 h-2 rounded-full bg-gray-800">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-blue-500 to-yellow-400 transition-all" />
        </div>

        {/* 题目卡片 */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6">
          {/* 题目标签 */}
          <div className="mb-3 flex gap-2">
            {currentQuestion.knowledgePointTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-blue-900/50 px-2.5 py-0.5 text-xs text-blue-300"
              >
                {tag}
              </span>
            ))}
            <span className="ml-auto rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400">
              {currentQuestion.difficulty}
            </span>
          </div>

          {/* 题干 */}
          <h2 className="mb-6 text-xl font-medium text-gray-100">
            {currentQuestion.content}
          </h2>

          {/* 选项 */}
          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <OptionButton
                key={option.id}
                option={option}
                state="default"
              />
            ))}
          </div>

          {/* 反馈区 (演示用: 显示正确反馈) */}
          <AnswerFeedback
            isCorrect={true}
            combo={5}
            score={150}
            explanation=""
          />
        </div>

        {/* 底部操作 */}
        <div className="mt-6 flex justify-between">
          <button className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:border-gray-500">
            ← 返回地图
          </button>
          <button className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 transition">
            下一题 →
          </button>
        </div>
      </div>
    </div>
  );
}
