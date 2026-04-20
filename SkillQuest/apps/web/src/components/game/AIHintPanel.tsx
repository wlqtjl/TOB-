/**
 * AIHintPanel — Socratic AI Mentor
 *
 * Provides personalized encouragement and thinking guidance per question.
 * Uses a "Socratic method" — hints guide thinking, never give direct answers.
 *
 * In production, calls LLM API for dynamic hint generation.
 * For demo, uses pre-crafted hint progressions.
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Lightbulb,
  ChevronRight,
  HelpCircle,
  Sparkles,
  MessageCircle,
  X,
} from 'lucide-react';

interface AIHintPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Toggle panel open/close */
  onToggle: () => void;
  /** Current question context */
  questionContext?: string;
  /** Whether the user answered correctly */
  answeredCorrectly?: boolean | null;
  /** Number of attempts so far */
  attemptCount?: number;
}

// Socratic hint progressions (demo)
const HINT_PROGRESSIONS = [
  [
    { type: 'encourage', text: '不着急，先思考一下这个场景中最关键的因素是什么？' },
    { type: 'guide', text: '想想看：在分布式系统中，数据的一致性和可用性之间有什么权衡？' },
    { type: 'nudge', text: '提示：考虑一下副本数量对系统可靠性的影响。' },
  ],
  [
    { type: 'encourage', text: '很好的思考方向！再想想还有哪些因素需要考虑？' },
    { type: 'guide', text: '在这种故障场景中，系统会自动执行什么恢复操作？' },
    { type: 'nudge', text: '提示：注意观察各组件之间的依赖关系。' },
  ],
  [
    { type: 'encourage', text: '你已经掌握了核心概念，这道题考验的是细节理解。' },
    { type: 'guide', text: '回忆一下，当节点故障时，数据的重建过程是怎样的？' },
    { type: 'nudge', text: '提示：关注「时间」这个维度——恢复需要多长时间？' },
  ],
];

const CORRECT_RESPONSES = [
  '太棒了！🎉 你完全理解了这个概念。',
  '正确！这种思路在实际运维中也非常关键。',
  '很好！你对系统架构的理解很扎实。',
  '答对了！你正在快速掌握这些知识。',
  '完美！这个知识点在面对真实故障时会非常有用。',
];

const WRONG_RESPONSES = [
  '别灰心，这个概念确实有些复杂。让我们换个角度想想...',
  '接近了！但还差一点。想想还有什么因素被忽略了？',
  '再试一次——有时候最直觉的答案并不总是对的。',
  '这是很常见的误解。让我帮你理清思路...',
];

export default function AIHintPanel({
  isOpen,
  onToggle,
  questionContext,
  answeredCorrectly,
  attemptCount = 0,
}: AIHintPanelProps) {
  const [hintLevel, setHintLevel] = useState(0);
  const [messages, setMessages] = useState<Array<{ role: 'ai' | 'system'; text: string; icon: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Reset on new question
  useEffect(() => {
    setHintLevel(0);
    setMessages([{
      role: 'ai',
      text: '你好！我是你的 AI 导师。遇到困难时，可以点击「获取提示」来获取思考方向。',
      icon: '🤖',
    }]);
  }, [questionContext]);

  // React to answer result
  useEffect(() => {
    if (answeredCorrectly === null || answeredCorrectly === undefined) return;

    setIsTyping(true);
    const timeout = setTimeout(() => {
      const text = answeredCorrectly
        ? CORRECT_RESPONSES[Math.floor(Math.random() * CORRECT_RESPONSES.length)]
        : WRONG_RESPONSES[Math.floor(Math.random() * WRONG_RESPONSES.length)];
      setMessages((prev) => [...prev, {
        role: 'ai',
        text,
        icon: answeredCorrectly ? '✅' : '💡',
      }]);
      setIsTyping(false);
    }, 800);

    return () => clearTimeout(timeout);
  }, [answeredCorrectly, attemptCount]);

  const requestHint = useCallback(() => {
    const progression = HINT_PROGRESSIONS[Math.floor(Math.random() * HINT_PROGRESSIONS.length)];
    const hint = progression[Math.min(hintLevel, progression.length - 1)];

    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        role: 'ai',
        text: hint.text,
        icon: hint.type === 'encourage' ? '💪' : hint.type === 'guide' ? '🧭' : '💡',
      }]);
      setHintLevel((l) => l + 1);
      setIsTyping(false);
    }, 600);
  }, [hintLevel]);

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-colors ${
          isOpen
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-blue-400 border border-gray-700 hover:border-blue-500/50'
        }`}
      >
        {isOpen ? <X size={20} /> : <Bot size={20} />}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-6 z-30 w-80 max-h-[400px] flex flex-col rounded-2xl border border-gray-700 bg-gray-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
                <Sparkles size={14} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">AI 导师</p>
                <p className="text-xs text-gray-500">苏格拉底式引导</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2"
                >
                  <span className="text-sm mt-0.5 flex-shrink-0">{msg.icon}</span>
                  <div className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'ai'
                      ? 'bg-gray-800/60 text-gray-200'
                      : 'bg-blue-600/20 text-blue-200'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 items-center"
                >
                  <span className="text-sm">🤖</span>
                  <div className="flex gap-1 rounded-xl bg-gray-800/60 px-3 py-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-gray-800 px-4 py-3 flex gap-2">
              <button
                onClick={requestHint}
                disabled={isTyping}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600/20 px-3 py-2 text-xs font-medium text-blue-400 transition hover:bg-blue-600/30 disabled:opacity-50"
              >
                <Lightbulb size={14} />
                获取提示
                {hintLevel > 0 && (
                  <span className="text-blue-500/60 text-xs">({hintLevel}/3)</span>
                )}
              </button>
              <button
                onClick={() => setMessages((prev) => [...prev, {
                  role: 'ai',
                  text: '加油！相信自己的判断，你比想象中更接近答案。',
                  icon: '💪',
                }])}
                disabled={isTyping}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-400 transition hover:bg-gray-700 disabled:opacity-50"
              >
                <MessageCircle size={14} />
                鼓励
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
