/**
 * Universal Play Page — play/[type]/[id]/page.tsx
 *
 * Route: /play/{type}/{id}?course={courseId}
 * - type determines which adapter to use (topology, matching, quiz, etc.)
 * - id is the level content ID
 * - course selects the vendor course
 *
 * Flow: Load content → adapter(content) → VisualScene → UniversalGameRenderer
 * All level types share this single page. Scenario Decision has its own renderer.
 */

'use client';

import React, { useMemo, useCallback, useState, Suspense } from 'react';
import Link from 'next/link';
import type {
  TopologyQuizLevel,
  MatchingQuestion,
  OrderingQuestion,
  QuizQuestion,
  TerminalQuizLevel,
  ScenarioQuizLevel,
  VirtualizationLevel,
  NarrativeConfig,
  ScenarioDecisionQuestion,
  LevelNarrative,
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
import UniversalGameRenderer from '../../../../../components/game/UniversalGameRenderer';
import GameHUD from '../../../../../components/game/GameHUD';
import NarrativeModal from '../../../../../components/game/NarrativeModal';
import ScenarioGameRenderer from '../../../../../components/game/ScenarioGameRenderer';
import LevelIntroModal from '../../../../../components/game/LevelIntroModal';
import { useGameState } from '../../../../../components/game/hooks/useGameState';
import { ErrorBoundary } from '../../../../../components/ui/ErrorBoundary';
import { useCourseId } from '../../../../../hooks/useCourseId';
import { COURSES, getPlayContent, getPlayContentTypes, getCourse, getLevelBriefing } from '../../../../../lib/mock-courses';
import { tenantConfig } from '../../../../../lib/tenant-config';
import LevelBriefingModal from '../../../../../components/game/LevelBriefingModal';

// ─── Adapter dispatch ──────────────────────────────────────────────

type ContentType = 'topology' | 'matching' | 'ordering' | 'quiz' | 'terminal' | 'scenario' | 'vm_placement' | 'scenario_decision';

function adaptContent(type: ContentType, data: Record<string, unknown>): VisualScene | null {
  if (!data || typeof data !== 'object') return null;
  // scenario_decision uses its own renderer, no adapter needed
  if (type === 'scenario_decision') return null;
  try {
    switch (type) {
      case 'topology': return topologyAdapter(data as unknown as TopologyQuizLevel);
      case 'matching': return matchingAdapter(data as unknown as MatchingQuestion);
      case 'ordering': return orderingAdapter(data as unknown as OrderingQuestion);
      case 'quiz': return quizAdapter(data as unknown as QuizQuestion);
      case 'terminal': return terminalAdapter(data as unknown as TerminalQuizLevel);
      case 'scenario': return scenarioAdapter(data as unknown as ScenarioQuizLevel);
      case 'vm_placement': return vmPlacementAdapter(data as unknown as VirtualizationLevel);
      default: return null;
    }
  } catch (err) {
    console.error(`[adaptContent] Adapter "${type}" failed:`, err);
    return null;
  }
}

const TYPE_LABELS = getPlayContentTypes();

// ─── Content field helpers ─────────────────────────────────────────

/** Safely extract a string field from untyped content record */
function getContentField(content: Record<string, unknown> | null, field: string): string | undefined {
  if (!content || typeof content !== 'object') return undefined;
  const val = content[field];
  return typeof val === 'string' ? val : undefined;
}

/** Safely extract a NarrativeConfig from untyped content record */
function getContentNarrative(content: Record<string, unknown> | null): NarrativeConfig | undefined {
  if (!content || typeof content !== 'object') return undefined;
  const val = content.preStory;
  if (val && typeof val === 'object' && 'channel' in (val as object) && 'messages' in (val as object)) {
    return val as NarrativeConfig;
  }
  return undefined;
}

// ─── Page Component ────────────────────────────────────────────────

function PlayContent({ type, id }: { type: string; id: string }) {
  const courseId = useCourseId();
  const course = getCourse(courseId);
  const tenant = tenantConfig();
  const contentType = type as ContentType;
  const [messages, setMessages] = useState<Array<{ text: string; correct: boolean }>>([]);
  const [narrativeComplete, setNarrativeComplete] = useState(false);
  const [briefingDismissed, setBriefingDismissed] = useState(false);
  const [introDismissed, setIntroDismissed] = useState(false);

  // Load content from shared data layer
  const content = getPlayContent(courseId, contentType);
  const totalQuestions = 1; // Will be dynamic from API

  // Load level briefing (content.levelId maps to briefing data)
  const contentLevelId = getContentField(content, 'levelId');
  const briefing = contentLevelId ? getLevelBriefing(courseId, contentLevelId) : null;

  // Check for preStory narrative config
  const preStory = getContentNarrative(content);
  const hasNarrative = !!preStory && !narrativeComplete;

  // Check for level narrative (scenario_decision type)
  const levelNarrative = content?.narrative as LevelNarrative | undefined;

  const { state: gameState, answerCorrect, answerWrong } = useGameState(totalQuestions);

  // Convert content → VisualScene via adapter (null for scenario_decision)
  const scene = useMemo(() => {
    if (!content) return null;
    if (contentType === 'scenario_decision') return null; // Uses own renderer
    return adaptContent(contentType, content);
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
        { text: result.message ?? (result.correct ? '正确！' : '错误'), correct: result.correct },
      ]);
    },
    [id, answerCorrect, answerWrong],
  );

  // ─── Scenario Decision — dedicated renderer ───
  if (contentType === 'scenario_decision' && content) {
    const questions = (content.questions ?? []) as ScenarioDecisionQuestion[];
    const narrative = content.narrative as LevelNarrative | undefined;

    if (questions.length === 0) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <p className="text-gray-400">没有情景选择题</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-surface p-4">
        {/* Level Intro (narrative) */}
        {narrative && !introDismissed && (
          <LevelIntroModal
            narrative={narrative}
            onStart={() => setIntroDismissed(true)}
          />
        )}

        <div className="mx-auto max-w-[700px]">
          {/* Back link */}
          <div className="mb-4">
            <a
              href={`/map?course=${encodeURIComponent(courseId)}`}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-400 transition"
            >
              ← 返回地图
            </a>
          </div>

          <ScenarioGameRenderer
            questions={questions}
            levelTitle={narrative?.title ?? '情景选择关'}
            onComplete={(score, stars) => {
              // In production, save progress to API
              console.log('[ScenarioComplete]', { score, stars });
            }}
            onAnswer={(idx, choiceId, isCorrect) => {
              console.log('[ScenarioAnswer]', { idx, choiceId, isCorrect });
            }}
          />
        </div>

        {/* Course/type tabs */}
        <div className="mx-auto max-w-[700px] mt-6 space-y-4">
          <div>
            <p className="text-xs text-gray-600 mb-2">切换关卡类型:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <Link
                  key={key}
                  href={`/play/${key}/demo?course=${courseId}`}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    key === contentType
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!content || !scene) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-gray-400">未找到关卡内容</p>
          <p className="mt-2 text-sm text-gray-600">
            课程: {course?.title ?? courseId} · 类型: {type} · ID: {id}
          </p>
          <a href={`/map?course=${courseId}`} className="mt-4 inline-block text-blue-600 hover:underline text-sm">
            ← 返回地图
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      {/* 关卡前知识普及 (在 Narrative 之前展示) */}
      {briefing && !briefingDismissed && (
        <LevelBriefingModal
          briefing={briefing}
          onStart={() => setBriefingDismissed(true)}
          onSkip={() => setBriefingDismissed(true)}
        />
      )}

      {/* Narrative Modal (pre-story, 只在知识普及完成后展示) */}
      {briefingDismissed && hasNarrative && preStory && (
        <NarrativeModal
          config={preStory}
          onComplete={() => setNarrativeComplete(true)}
        />
      )}

      {/* Header */}
      <div className="mx-auto max-w-[950px] mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-blue-300">
              {TYPE_LABELS[contentType] ?? contentType}
            </h1>
            <p className="text-xs text-gray-500">
              {course?.title ?? courseId} · {scene.title} · ID: {id}
            </p>
          </div>
          <a
            href={`/map?course=${courseId}`}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-500 transition"
          >
            ← 返回地图
          </a>
        </div>
      </div>

      {/* Game Canvas + HUD */}
      <div className="mx-auto max-w-[950px] relative">
        <GameHUD gameState={gameState} levelTitle={scene.title} />
        <ErrorBoundary>
          <UniversalGameRenderer
            scene={scene}
            onInteraction={handleInteraction}
            comboCount={gameState.combo.current}
            className="border border-gray-800 rounded-xl overflow-hidden mt-12"
            debug={false}
          />
        </ErrorBoundary>
      </div>

      {/* Interaction messages */}
      <div className="mx-auto max-w-[950px] mt-4 space-y-2">
        {messages.slice(-3).map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg px-4 py-2 text-sm ${
              msg.correct
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {/* Course tabs + type switcher */}
      <div className="mx-auto max-w-[950px] mt-6 space-y-4">
        {COURSES.length > 1 && (
          <div>
            <p className="text-xs text-gray-600 mb-2">切换课程:</p>
            <div className="flex flex-wrap gap-2">
              {COURSES.map((c) => (
                <Link
                  key={c.id}
                  href={`/play/${type}/${id}?course=${c.id}`}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    c.id === courseId
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                      : 'border-gray-700 text-gray-500 hover:border-gray-500'
                  }`}
                >
                  {c.title}
                </Link>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-600 mb-2">切换关卡类型:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <Link
                key={key}
                href={`/play/${key}/demo?course=${courseId}`}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  key === contentType
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                    : 'border-gray-700 text-gray-500 hover:border-gray-500'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlayPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const resolvedParams = React.use(params);
  const { type, id } = resolvedParams;

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-500 animate-pulse">加载关卡...</p></div>}>
      <PlayContent type={type} id={id} />
    </Suspense>
  );
}
