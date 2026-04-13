/**
 * Ordering Adapter — OrderingQuestion → VisualScene
 *
 * Steps shown as draggable entities on the left.
 * Numbered slots on the right as drop targets.
 * Particles flow through correctly placed steps.
 */

import type { OrderingQuestion } from '@skillquest/types';
import type { VisualScene, InteractionResult } from '../visual-scene';
import {
  entityStyle,
  connectionStyle,
  defaultFlowingParticles,
  disabledParticles,
  defaultFeedback,
  defaultViewport,
} from '../visual-scene';

export function orderingAdapter(question: OrderingQuestion): VisualScene {
  const viewport = defaultViewport();
  const stepX = Math.round(viewport.width * 0.17);
  const slotX = Math.round(viewport.width * 0.72);
  const yStart = 60;
  const ySpacing = 70;

  // Draggable step entities (shuffled order from question data)
  const stepEntities = question.steps.map((step, i) => ({
    id: step.id,
    type: 'step',
    label: step.text,
    icon: '📋',
    position: { x: stepX, y: yStart + i * ySpacing },
    size: { w: 280, h: 48 },
    style: entityStyle('rgba(168,85,247,0.15)', '#a855f7'),
    group: 'step',
    draggable: true,
    metadata: { originalIndex: i },
  }));

  // Slot entities (numbered drop targets)
  const slotEntities = question.correctOrder.map((_, i) => ({
    id: `slot-${i}`,
    type: 'slot',
    label: `第 ${i + 1} 步`,
    icon: `${i + 1}️⃣`,
    position: { x: slotX, y: yStart + i * ySpacing },
    size: { w: 280, h: 48 },
    style: entityStyle('rgba(107,114,128,0.15)', '#6b7280', { opacity: 0.8 }),
    group: 'slot',
    draggable: false,
    metadata: { slotIndex: i, expectedStepId: question.correctOrder[i] },
  }));

  // Sequential connections between slots (chain visualization)
  const slotConnections = slotEntities.slice(0, -1).map((slot, i) => ({
    id: `chain-${i}`,
    from: slot.id,
    to: slotEntities[i + 1].id,
    style: connectionStyle('#374151', { dashPattern: [4, 4], opacity: 0.4 }),
    particleConfig: disabledParticles(),
    bidirectional: false,
  }));

  const interactions = [
    {
      type: 'drag' as const,
      sourceFilter: 'step',
      targetFilter: 'slot',
      validate: (action: Record<string, unknown>): InteractionResult => {
        const entityId = String(action['entityId'] ?? '');
        const targetSlot = String(action['targetSlot'] ?? '');
        const slotIndex = parseInt(targetSlot.replace('slot-', ''), 10);
        const correct = question.correctOrder[slotIndex] === entityId;
        return {
          correct,
          message: correct ? '位置正确！' : '顺序不对，再想想',
          highlightIds: [entityId, targetSlot],
        };
      },
    },
    {
      type: 'sequence' as const,
      validate: (action: Record<string, unknown>): InteractionResult => {
        const orderedIds = action['orderedIds'] as string[] | undefined;
        if (!orderedIds) return { correct: false, message: '请排列所有步骤' };
        const correct = orderedIds.every(
          (id, i) => id === question.correctOrder[i],
        );
        return {
          correct,
          message: correct ? '排序完全正确！' : '还有步骤顺序不对',
        };
      },
    },
  ];

  return {
    id: question.id,
    title: question.content,
    sourceType: 'ordering',
    entities: [...stepEntities, ...slotEntities],
    connections: slotConnections,
    interactions,
    feedback: defaultFeedback(),
    viewport: defaultViewport(),
  };
}

/**
 * Activate flow particles on the chain after correct ordering.
 */
export function activateOrderFlow(scene: VisualScene): VisualScene {
  return {
    ...scene,
    connections: scene.connections.map((conn) => ({
      ...conn,
      particleConfig: defaultFlowingParticles('#a855f7'),
      style: connectionStyle('#a855f7', { width: 2 }),
    })),
  };
}
