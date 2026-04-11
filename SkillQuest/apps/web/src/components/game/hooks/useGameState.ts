/**
 * useGameState — Game state management hook
 *
 * Integrates ComboTracker + ScoringEngine with React state.
 * Provides unified game progression tracking.
 */

'use client';

import { useReducer, useCallback, useMemo } from 'react';
import { ComboTracker, ScoringEngine } from '@skillquest/game-engine';
import type { ComboState, ScoringInput } from '@skillquest/game-engine';
import type { ScoreResult } from '@skillquest/types';

export interface GameState {
  /** Current question/step index */
  currentIndex: number;
  /** Total questions in level */
  totalQuestions: number;
  /** Accumulated score */
  totalScore: number;
  /** Stars earned */
  stars: 0 | 1 | 2 | 3;
  /** Current combo state */
  combo: ComboState;
  /** Number of correct answers */
  correctCount: number;
  /** Number of wrong answers */
  wrongCount: number;
  /** Level complete */
  isComplete: boolean;
  /** Time started (ms since epoch) */
  startTime: number;
  /** Last score result */
  lastScoreResult: ScoreResult | null;
  /** History of answers */
  answers: Array<{ questionId: string; correct: boolean; score: number }>;
}

type GameAction =
  | { type: 'ANSWER_CORRECT'; questionId: string }
  | { type: 'ANSWER_WRONG'; questionId: string }
  | { type: 'NEXT_QUESTION' }
  | { type: 'COMPLETE_LEVEL' }
  | { type: 'RESET'; totalQuestions: number };

function createInitialState(totalQuestions: number): GameState {
  return {
    currentIndex: 0,
    totalQuestions,
    totalScore: 0,
    stars: 0,
    combo: { count: 0, tier: 'none', multiplier: 1 },
    correctCount: 0,
    wrongCount: 0,
    isComplete: false,
    startTime: Date.now(),
    lastScoreResult: null,
    answers: [],
  };
}

// ComboTracker and ScoringEngine are shared across the reducer
// via closure — they maintain internal state
let comboTracker: ComboTracker;
let scoringEngine: ScoringEngine;

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ANSWER_CORRECT': {
      comboTracker.hit();
      const combo = comboTracker.getState();
      const elapsedSec = (Date.now() - state.startTime) / 1000;
      const input: ScoringInput = {
        correctCount: state.correctCount + 1,
        totalQuestions: state.totalQuestions,
        comboMultiplier: combo.multiplier,
        timeTakenSec: elapsedSec,
        timeLimitSec: state.totalQuestions * 30, // 30s per question
        difficulty: 'intermediate',
      };
      const result = scoringEngine.calculate(input);
      return {
        ...state,
        correctCount: state.correctCount + 1,
        combo,
        totalScore: state.totalScore + result.baseScore + result.comboBonus,
        stars: result.stars,
        lastScoreResult: result,
        answers: [...state.answers, { questionId: action.questionId, correct: true, score: result.baseScore + result.comboBonus }],
      };
    }

    case 'ANSWER_WRONG': {
      comboTracker.miss();
      return {
        ...state,
        wrongCount: state.wrongCount + 1,
        combo: comboTracker.getState(),
        answers: [...state.answers, { questionId: action.questionId, correct: false, score: 0 }],
      };
    }

    case 'NEXT_QUESTION': {
      const nextIndex = state.currentIndex + 1;
      const isComplete = nextIndex >= state.totalQuestions;
      return {
        ...state,
        currentIndex: nextIndex,
        isComplete,
      };
    }

    case 'COMPLETE_LEVEL':
      return { ...state, isComplete: true };

    case 'RESET':
      comboTracker.reset();
      return createInitialState(action.totalQuestions);

    default:
      return state;
  }
}

export function useGameState(totalQuestions: number) {
  // Initialize engines
  useMemo(() => {
    comboTracker = new ComboTracker();
    scoringEngine = new ScoringEngine();
  }, []);

  const [state, dispatch] = useReducer(
    gameReducer,
    totalQuestions,
    createInitialState,
  );

  const answerCorrect = useCallback((questionId: string) => {
    dispatch({ type: 'ANSWER_CORRECT', questionId });
  }, []);

  const answerWrong = useCallback((questionId: string) => {
    dispatch({ type: 'ANSWER_WRONG', questionId });
  }, []);

  const nextQuestion = useCallback(() => {
    dispatch({ type: 'NEXT_QUESTION' });
  }, []);

  const completeLevel = useCallback(() => {
    dispatch({ type: 'COMPLETE_LEVEL' });
  }, []);

  const reset = useCallback((newTotal?: number) => {
    dispatch({ type: 'RESET', totalQuestions: newTotal ?? totalQuestions });
  }, [totalQuestions]);

  return {
    state,
    answerCorrect,
    answerWrong,
    nextQuestion,
    completeLevel,
    reset,
  };
}
