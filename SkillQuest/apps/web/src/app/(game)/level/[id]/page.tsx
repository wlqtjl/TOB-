/**
 * 关卡答题界面 — 使用 VisualScene + UniversalGameRenderer
 * 支持多厂商课程通过 ?course=xxx 切换
 */

'use client';

import React, { useMemo, useCallback, useState, Suspense } from 'react';
import type { QuizQuestion } from '@skillquest/types';
import type { InteractionResult } from '@skillquest/game-engine';
import { quizAdapter, highlightCorrectOption } from '@skillquest/game-engine';
import UniversalGameRenderer from '../../../../components/game/UniversalGameRenderer';
import GameHUD from '../../../../components/game/GameHUD';
import { useGameState } from '../../../../components/game/hooks/useGameState';
import { ErrorBoundary } from '../../../../components/ui/ErrorBoundary';
import CourseSwitcher from '../../../../components/ui/CourseSwitcher';
import { useCourseId } from '../../../../hooks/useCourseId';
import { getLevelQuestions, getCourse, getLevelBriefing } from '../../../../lib/mock-courses';
import LevelBriefingModal from '../../../../components/game/LevelBriefingModal';

function LevelContent({ levelId }: { levelId: string }) {
  const courseId = useCourseId();
  const course = getCourse(courseId);
  const allQuestions = getLevelQuestions(courseId);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [startTime] = useState(() => Date.now());
  // Map URL levelId (e.g. '1') to data levelId (e.g. 'l1')
  const dataLevelId = levelId.startsWith('l') ? levelId : `l${levelId}`;
  const briefing = getLevelBriefing(courseId, dataLevelId);
  const [briefingDismissed, setBriefingDismissed] = useState(false);

  // Filter questions for this level if possible, otherwise use all
  const questions = useMemo(() => {
    const levelQs = allQuestions.filter((q) => q.levelId === levelId);
    return levelQs.length > 0 ? levelQs : allQuestions;
  }, [allQuestions, levelId]);

  const { state: gameState, answerCorrect, answerWrong, nextQuestion } = useGameState(questions.length);

  const currentQuestion = questions[currentIdx];

  // Build VisualScene for the current question (safe even if currentQuestion is undefined)
  const scene = useMemo(() => {
    if (!currentQuestion) return null;
    const base = quizAdapter(currentQuestion);
    if (answered) {
      return highlightCorrectOption(base, currentQuestion.correctOptionIds);
    }
    return base;
  }, [currentQuestion, answered]);

  const handleInteraction = useCallback(
    (result: InteractionResult) => {
      if (answered || !currentQuestion) return;
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
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setAnswered(false);
      nextQuestion();
    }
  }, [currentIdx, questions.length, nextQuestion]);

  /** Build results page URL with game stats */
  const buildResultsUrl = useCallback(() => {
    const timeLimit = questions.length * 30;
    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
    const timeRemaining = Math.max(0, timeLimit - elapsedSec);
    const correctCount = gameState.answers.filter((a) => a.correct).length;
    const params = new URLSearchParams({
      course: courseId,
      level: levelId,
      correct: String(correctCount),
      total: String(questions.length),
      timeRemaining: String(timeRemaining),
      timeLimit: String(timeLimit),
      combo: String(gameState.combo.max),
    });
    return `/results?${params.toString()}`;
  }, [courseId, levelId, questions.length, startTime, gameState]);

  if (!currentQuestion || !scene) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-gray-400">未找到关卡题目</p>
          <p className="mt-2 text-sm text-gray-600">课程: {course?.title ?? courseId} · 关卡: {levelId}</p>
          <a href={`/map?course=${courseId}`} className="mt-4 inline-block text-blue-600 hover:underline text-sm">← 返回地图</a>
        </div>
      </div>
    );
  }

  const levelTitle = course ? `${course.title} · 关卡答题` : `关卡: ${levelId}`;

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      {/* 关卡前知识普及 */}
      {briefing && !briefingDismissed && (
        <LevelBriefingModal
          briefing={briefing}
          onStart={() => setBriefingDismissed(true)}
          onSkip={() => setBriefingDismissed(true)}
        />
      )}

      {/* 课程切换 */}
      <div className="mx-auto max-w-[950px] mb-3">
        <CourseSwitcher />
      </div>

      {/* Game Canvas + HUD */}
      <div className="mx-auto max-w-[950px] relative">
        <GameHUD
          gameState={gameState}
          levelTitle={levelTitle}
          timeLimitSec={questions.length * 30}
        />

        <ErrorBoundary>
          <UniversalGameRenderer
            scene={scene}
            onInteraction={handleInteraction}
            comboCount={gameState.combo.current}
            className="border border-gray-800 rounded-xl overflow-hidden mt-14"
          />
        </ErrorBoundary>
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
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-red-200 bg-red-50'
          }`}>
            <p className={`font-bold ${
              gameState.answers[gameState.answers.length - 1]?.correct ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {gameState.answers[gameState.answers.length - 1]?.correct ? '回答正确！' : '回答错误'}
            </p>
            <p className="mt-2 text-sm text-gray-300">{currentQuestion.explanation}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-4 flex justify-between">
          <a
            href={`/map?course=${courseId}`}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:border-gray-500 transition"
          >
            ← 返回地图
          </a>
          {answered && currentIdx < questions.length - 1 && (
            <button
              onClick={handleNext}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 transition"
            >
              下一题 →
            </button>
          )}
          {answered && currentIdx === questions.length - 1 && (
            <a
              href={buildResultsUrl()}
              className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition"
            >
              View Results
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LevelPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const levelId = resolvedParams.id;

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-500 animate-pulse">加载关卡...</p></div>}>
      <LevelContent levelId={levelId} />
    </Suspense>
  );
}
