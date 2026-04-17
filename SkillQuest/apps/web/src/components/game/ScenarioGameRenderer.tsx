'use client';

/**
 * ScenarioGameRenderer — 情景选择关渲染器
 *
 * 用户扮演角色（如运维工程师），遇到真实情景，做出选择。
 * 每个选择都有后果展示 + 知识点提炼。
 *
 * 适用知识点：操作流程、故障处理、最佳实践
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, CheckCircle2, XCircle, Lightbulb,
  ChevronRight, RotateCcw, Trophy,
} from 'lucide-react';
import type { ScenarioDecisionQuestion } from '@skillquest/types';

interface ScenarioGameRendererProps {
  questions: ScenarioDecisionQuestion[];
  levelTitle?: string;
  onComplete: (score: number, stars: number) => void;
  onAnswer?: (questionIndex: number, choiceId: string, isCorrect: boolean) => void;
}

/* ────────────────── Helpers ────────────────── */

/** Calculate star rating based on correctness percentage */
function calculateStars(correctCount: number, totalQuestions: number): 0 | 1 | 2 | 3 {
  if (totalQuestions === 0) return 0;
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  if (percentage >= 90) return 3;
  if (percentage >= 70) return 2;
  if (percentage >= 50) return 1;
  return 0;
}

/* ────────────────── Single Scenario Card ────────────────── */

function ScenarioCard({
  question,
  questionIndex,
  totalQuestions,
  onAnswered,
}: {
  question: ScenarioDecisionQuestion;
  questionIndex: number;
  totalQuestions: number;
  onAnswered: (choiceId: string, isCorrect: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showConsequence, setShowConsequence] = useState(false);

  const selectedChoice = question.choices.find((c) => c.id === selected);
  const isCorrect = selectedChoice?.isCorrect ?? false;

  const handleSelect = useCallback((choiceId: string) => {
    if (selected) return; // Already answered
    setSelected(choiceId);
    // Show consequence after brief delay
    setTimeout(() => setShowConsequence(true), 600);
  }, [selected]);

  const handleContinue = useCallback(() => {
    if (selected) {
      onAnswered(selected, isCorrect);
    }
  }, [selected, isCorrect, onAnswered]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-500 rounded-full"
            initial={{ width: `${(questionIndex / totalQuestions) * 100}%` }}
            animate={{ width: `${((questionIndex + (selected ? 1 : 0)) / totalQuestions) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="text-xs text-gray-400">{questionIndex + 1}/{totalQuestions}</span>
      </div>

      {/* Role badge */}
      <motion.div
        className="flex items-center gap-2 mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1">
          <User size={14} className="text-indigo-500" />
          <span className="text-xs font-medium text-indigo-600">{question.role}</span>
        </div>
      </motion.div>

      {/* Scenario description */}
      <motion.div
        className="rounded-xl bg-gray-50 border border-gray-200 p-5 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
          {question.scenario}
        </p>
      </motion.div>

      {/* Choices */}
      <div className="space-y-3 mb-6">
        {question.choices.map((choice, i) => {
          const isThisSelected = selected === choice.id;
          const isRevealed = selected !== null;

          let borderClass = 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30';
          let bgClass = 'bg-white';
          if (isRevealed) {
            if (choice.isCorrect) {
              borderClass = 'border-emerald-300';
              bgClass = 'bg-emerald-50';
            } else if (isThisSelected && !choice.isCorrect) {
              borderClass = 'border-red-300';
              bgClass = 'bg-red-50';
            } else {
              borderClass = 'border-gray-100';
              bgClass = 'bg-gray-50 opacity-60';
            }
          }

          return (
            <motion.button
              key={choice.id}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all ${borderClass} ${bgClass} ${isRevealed ? 'cursor-default' : 'cursor-pointer'}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
              onClick={() => handleSelect(choice.id)}
              disabled={isRevealed}
              whileHover={!isRevealed ? { scale: 1.01 } : {}}
              whileTap={!isRevealed ? { scale: 0.99 } : {}}
            >
              <div className="flex items-start gap-3">
                <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                  isRevealed && choice.isCorrect
                    ? 'bg-emerald-500 text-white'
                    : isRevealed && isThisSelected && !choice.isCorrect
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-500'
                }`}>
                  {isRevealed && choice.isCorrect ? (
                    <CheckCircle2 size={16} />
                  ) : isRevealed && isThisSelected && !choice.isCorrect ? (
                    <XCircle size={16} />
                  ) : (
                    choice.id
                  )}
                </span>
                <span className="text-sm text-gray-700">{choice.text}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Consequence */}
      <AnimatePresence>
        {showConsequence && selectedChoice && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 overflow-hidden"
          >
            <div className={`rounded-xl border-2 p-5 ${
              isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
            }`}>
              <p className={`text-sm font-semibold mb-2 ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                {isCorrect ? '✅ 正确！' : '❌ 不太对...'}
              </p>

              {/* Consequence narrative */}
              <div className="rounded-lg bg-white/70 border border-gray-100 p-4 mb-3">
                <p className="text-xs text-gray-400 mb-1">🎬 接下来发生了什么...</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedChoice.consequence}
                </p>
              </div>

              {/* Knowledge point */}
              <div className="flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                <Lightbulb size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800">
                  <strong>知识点：</strong>{question.knowledgePoint}
                </p>
              </div>
            </div>

            {/* Continue button */}
            <div className="flex justify-end mt-4">
              <motion.button
                className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 transition shadow-sm"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleContinue}
              >
                继续 <ChevronRight size={16} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────── Results Screen ────────────────── */

function ResultsScreen({
  correctCount,
  totalQuestions,
  onComplete,
}: {
  correctCount: number;
  totalQuestions: number;
  onComplete: () => void;
}) {
  const stars = calculateStars(correctCount, totalQuestions);

  return (
    <motion.div
      className="w-full max-w-md mx-auto text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Trophy className="mx-auto text-yellow-400 mb-4" size={48} />
      <h2 className="text-2xl font-bold text-gray-800 mb-2">关卡完成！</h2>

      <div className="flex justify-center gap-1 mb-4">
        {[1, 2, 3].map((s) => (
          <span key={s} className={`text-3xl ${s <= stars ? 'text-yellow-400' : 'text-gray-200'}`}>
            ★
          </span>
        ))}
      </div>

      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 mb-6">
        <p className="text-3xl font-bold text-indigo-600">{correctCount}/{totalQuestions}</p>
        <p className="text-sm text-gray-500">回答正确</p>
      </div>

      <motion.button
        className="rounded-lg bg-indigo-500 px-8 py-3 text-sm font-medium text-white hover:bg-indigo-600 transition shadow-md"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onComplete}
      >
        完成
      </motion.button>
    </motion.div>
  );
}

/* ────────────────── Main Renderer ────────────────── */

export default function ScenarioGameRenderer({
  questions,
  levelTitle,
  onComplete,
  onAnswer,
}: ScenarioGameRendererProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleAnswered = useCallback((choiceId: string, isCorrect: boolean) => {
    if (isCorrect) setCorrectCount((c) => c + 1);
    onAnswer?.(currentIndex, choiceId, isCorrect);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setFinished(true);
    }
  }, [currentIndex, questions.length, onAnswer]);

  const handleComplete = useCallback(() => {
    const stars = calculateStars(correctCount, questions.length);
    const score = Math.round((correctCount / questions.length) * 100);
    onComplete(score, stars);
  }, [correctCount, questions.length, onComplete]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎭</span>
          <h2 className="text-lg font-bold text-gray-800">
            {levelTitle ?? '情景选择关'}
          </h2>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          根据情景做出最佳选择，每个选择都有后果
        </p>
      </div>

      {/* Content */}
      <div className="p-6 min-h-[400px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!finished ? (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-full"
            >
              <ScenarioCard
                question={questions[currentIndex]}
                questionIndex={currentIndex}
                totalQuestions={questions.length}
                onAnswered={handleAnswered}
              />
            </motion.div>
          ) : (
            <ResultsScreen
              correctCount={correctCount}
              totalQuestions={questions.length}
              onComplete={handleComplete}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
