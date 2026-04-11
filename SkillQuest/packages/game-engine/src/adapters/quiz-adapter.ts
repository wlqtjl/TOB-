/**
 * Quiz Adapter — QuizQuestion → VisualScene
 *
 * Central question entity surrounded by option entities in a radial layout.
 * Click an option to select it. Correct answer triggers particle burst.
 */

import type { QuizQuestion } from '@skillquest/types';
import type { VisualScene, InteractionResult } from '../visual-scene';
import {
  entityStyle,
  connectionStyle,
  disabledParticles,
  defaultFlowingParticles,
  defaultFeedback,
  defaultViewport,
} from '../visual-scene';

export function quizAdapter(question: QuizQuestion): VisualScene {
  const viewport = defaultViewport();
  const centerX = viewport.width / 2;
  const centerY = viewport.height * 0.44;
  const radius = Math.min(viewport.width, viewport.height) * 0.32;
  const correctSet = new Set(question.correctOptionIds);

  // Central question entity
  const questionEntity = {
    id: 'question-center',
    type: 'question',
    label: question.content,
    icon: '❓',
    position: { x: centerX, y: centerY },
    size: { w: 120, h: 120 },
    style: entityStyle(
      'rgba(59,130,246,0.2)',
      '#3b82f6',
      { glowColor: 'rgba(59,130,246,0.4)', glowRadius: 12 },
    ),
    draggable: false,
    metadata: {
      questionType: question.type,
      difficulty: question.difficulty,
      tags: question.knowledgePointTags,
    },
  };

  // Option entities arranged radially
  const optionEntities = question.options.map((opt, i) => {
    const angle = (2 * Math.PI * i) / question.options.length - Math.PI / 2;
    return {
      id: opt.id,
      type: 'option',
      label: opt.text,
      icon: String.fromCharCode(65 + i), // A, B, C, D
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
      size: { w: 180, h: 48 },
      style: entityStyle('rgba(107,114,128,0.15)', '#6b7280'),
      group: 'option',
      draggable: false,
      metadata: { optionId: opt.id, isCorrect: correctSet.has(opt.id) },
    };
  });

  // Connections from center to each option
  const connections = optionEntities.map((opt) => ({
    id: `conn-${opt.id}`,
    from: 'question-center',
    to: opt.id,
    style: connectionStyle('#374151', { width: 1, opacity: 0.3 }),
    particleConfig: disabledParticles(),
    bidirectional: false,
  }));

  const interactions = [
    {
      type: 'click' as const,
      sourceFilter: 'option',
      validate: (action: Record<string, unknown>): InteractionResult => {
        const entityId = String(action['entityId'] ?? '');
        const correct = correctSet.has(entityId);
        return {
          correct,
          message: correct
            ? '回答正确！'
            : `回答错误。${question.explanation}`,
          highlightIds: [entityId, ...question.correctOptionIds],
        };
      },
    },
  ];

  return {
    id: question.id,
    title: question.content,
    sourceType: 'quiz',
    entities: [questionEntity, ...optionEntities],
    connections,
    interactions,
    feedback: defaultFeedback(),
    viewport: defaultViewport(),
  };
}

/**
 * Highlight the correct option with flowing particles after answer.
 */
export function highlightCorrectOption(
  scene: VisualScene,
  correctOptionIds: string[],
): VisualScene {
  const correctSet = new Set(correctOptionIds);
  return {
    ...scene,
    connections: scene.connections.map((conn) => {
      if (correctSet.has(conn.to)) {
        return {
          ...conn,
          style: connectionStyle('#22c55e', { width: 2 }),
          particleConfig: defaultFlowingParticles('#22c55e'),
        };
      }
      return conn;
    }),
    entities: scene.entities.map((ent) => {
      if (correctSet.has(ent.id)) {
        return {
          ...ent,
          style: entityStyle('rgba(34,197,94,0.2)', '#22c55e', {
            glowColor: 'rgba(34,197,94,0.5)',
            glowRadius: 10,
          }),
        };
      }
      return ent;
    }),
  };
}
