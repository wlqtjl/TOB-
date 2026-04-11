/**
 * 关卡答题界面 — 使用 VisualScene + UniversalGameRenderer
 *
 * 核心体验:
 * - Canvas 粒子反馈: 正确→绿色爆发 + 分数飞出 / 错误→红色震动
 * - Combo 连击: ComboTracker 驱动视觉升级
 * - 与 map 和 play 页面共享同一个渲染引擎
 */

'use client';

import React, { useMemo, useCallback, useState } from 'react';
import type { QuizQuestion } from '@skillquest/types';
import type { InteractionResult } from '@skillquest/game-engine';
import { quizAdapter, highlightCorrectOption } from '@skillquest/game-engine';
import UniversalGameRenderer from '../../../../components/game/UniversalGameRenderer';
import GameHUD from '../../../../components/game/GameHUD';
import { useGameState } from '../../../../components/game/hooks/useGameState';

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

export default function LevelPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const levelId = resolvedParams.id;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answered, setAnswered] = useState(false);

  const { state: gameState, answerCorrect, answerWrong, nextQuestion } = useGameState(mockQuestions.length);

  const currentQuestion = mockQuestions[currentIdx];

  // Build VisualScene for the current question
  const scene = useMemo(() => {
    const base = quizAdapter(currentQuestion);
    if (answered) {
      return highlightCorrectOption(base, currentQuestion.correctOptionIds);
    }
    return base;
  }, [currentQuestion, answered]);

  const handleInteraction = useCallback(
    (result: InteractionResult) => {
      if (answered) return;
      setAnswered(true);

      if (result.correct) {
        answerCorrect(currentQuestion.id);
      } else {
        answerWrong(currentQuestion.id);
      }
    },
    [answered, currentQuestion, answerCorrect, answerWrong],
  );

  const handleNext = useCallback(() => {
    if (currentIdx < mockQuestions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setAnswered(false);
      nextQuestion();
    }
  }, [currentIdx, nextQuestion]);

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      {/* Game Canvas + HUD */}
      <div className="mx-auto max-w-[950px] relative">
        <GameHUD
          gameState={gameState}
          levelTitle={`关卡: VLAN配置实验`}
          timeLimitSec={mockQuestions.length * 30}
        />

        {/* Canvas 渲染的选择题 — 替代静态 HTML 卡片 */}
        <UniversalGameRenderer
          scene={scene}
          onInteraction={handleInteraction}
          comboCount={gameState.combo.current}
          className="border border-gray-800 rounded-xl overflow-hidden mt-14"
        />
      </div>

      {/* Question details + explanation */}
      <div className="mx-auto max-w-[950px] mt-4">
        {/* Knowledge tags */}
        <div className="flex gap-2 mb-3">
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

        {/* Feedback */}
        {answered && (
          <div className={`rounded-xl border p-4 ${
            gameState.answers[gameState.answers.length - 1]?.correct
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-red-500/30 bg-red-500/10'
          }`}>
            <p className={`font-bold ${
              gameState.answers[gameState.answers.length - 1]?.correct ? 'text-green-400' : 'text-red-400'
            }`}>
              {gameState.answers[gameState.answers.length - 1]?.correct ? '✅ 回答正确！' : '❌ 回答错误'}
            </p>
            <p className="mt-2 text-sm text-gray-300">{currentQuestion.explanation}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-4 flex justify-between">
          <a
            href="/map"
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:border-gray-500 transition"
          >
            ← 返回地图
          </a>
          {answered && currentIdx < mockQuestions.length - 1 && (
            <button
              onClick={handleNext}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 transition"
            >
              下一题 →
            </button>
          )}
          {answered && currentIdx === mockQuestions.length - 1 && (
            <a
              href="/map"
              className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-500 transition"
            >
              🎉 完成关卡
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
