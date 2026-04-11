/**
 * Matching Adapter — MatchingQuestion → VisualScene
 *
 * Left column concepts ↔ Right column concepts.
 * User draws connections between matching pairs.
 * Correct connections trigger particle flow confirmation.
 */

import type { MatchingQuestion } from '@skillquest/types';
import type { VisualScene, InteractionResult } from '../visual-scene';
import {
  entityStyle,
  connectionStyle,
  defaultFlowingParticles,
  disabledParticles,
  defaultFeedback,
  defaultViewport,
} from '../visual-scene';

const LEFT_X = 150;
const RIGHT_X = 750;
const Y_START = 80;
const Y_SPACING = 80;

export function matchingAdapter(question: MatchingQuestion): VisualScene {
  const correctMap = new Map(question.correctPairs);
  const reverseMap = new Map(question.correctPairs.map(([l, r]) => [r, l]));

  // Left entities
  const leftEntities = question.leftItems.map((item, i) => ({
    id: item.id,
    type: 'concept',
    label: item.text,
    icon: '🔵',
    position: { x: LEFT_X, y: Y_START + i * Y_SPACING },
    size: { w: 200, h: 48 },
    style: entityStyle('rgba(59,130,246,0.15)', '#3b82f6'),
    group: 'left',
    draggable: false,
    metadata: { side: 'left' },
  }));

  // Right entities
  const rightEntities = question.rightItems.map((item, i) => ({
    id: item.id,
    type: 'concept',
    label: item.text,
    icon: '🟠',
    position: { x: RIGHT_X, y: Y_START + i * Y_SPACING },
    size: { w: 200, h: 48 },
    style: entityStyle('rgba(249,115,22,0.15)', '#f97316'),
    group: 'right',
    draggable: false,
    metadata: { side: 'right' },
  }));

  const entities = [...leftEntities, ...rightEntities];

  // No pre-drawn connections; user creates them via interaction
  const interactions = [
    {
      type: 'connect' as const,
      sourceFilter: 'left',
      targetFilter: 'right',
      validate: (action: Record<string, unknown>): InteractionResult => {
        const fromId = String(action['fromId'] ?? '');
        const toId = String(action['toId'] ?? '');
        const correct = correctMap.get(fromId) === toId || reverseMap.get(fromId) === toId;
        return {
          correct,
          message: correct ? '配对正确！' : '配对不正确',
          highlightIds: [fromId, toId],
        };
      },
    },
  ];

  return {
    id: question.id,
    title: question.content,
    sourceType: 'matching',
    entities,
    connections: [],
    interactions,
    feedback: defaultFeedback(),
    viewport: defaultViewport(),
  };
}

/**
 * Create a confirmed connection for a correct pair.
 * Returns a connection with flowing particles to indicate correctness.
 */
export function createConfirmedPairConnection(
  fromId: string,
  toId: string,
  index: number,
) {
  return {
    id: `match-${fromId}-${toId}`,
    from: fromId,
    to: toId,
    style: connectionStyle('#22c55e', { width: 2 }),
    particleConfig: defaultFlowingParticles('#22c55e'),
    bidirectional: false,
    userCreated: true,
  };
}
