/**
 * Scenario Adapter — ScenarioQuizLevel → VisualScene
 *
 * Troubleshooting narrative as a branching tree.
 * Central opening node → choice branches → next steps.
 * Optimal path highlighted with flowing particles.
 */

import type { ScenarioQuizLevel } from '@skillquest/types';
import type { VisualScene, InteractionResult } from '../visual-scene';
import {
  entityStyle,
  connectionStyle,
  disabledParticles,
  defaultFlowingParticles,
  defaultFeedback,
  defaultViewport,
} from '../visual-scene';

export function scenarioAdapter(quiz: ScenarioQuizLevel): VisualScene {
  const viewport = defaultViewport();
  const centerX = viewport.width / 2;
  const yStart = 60;
  const yStepSpacing = 140;
  const xChoiceSpread = Math.round(viewport.width * 0.22);
  const optimalSet = new Set(quiz.optimalPath);
  const entities: VisualScene['entities'] = [];
  const connections: VisualScene['connections'] = [];

  // Opening narration entity
  entities.push({
    id: 'opening',
    type: 'scenario-opening',
    label: quiz.opening.length > 60 ? quiz.opening.slice(0, 60) + '…' : quiz.opening,
    icon: '📞',
    position: { x: centerX, y: yStart },
    size: { w: 300, h: 60 },
    style: entityStyle(
      'rgba(239,68,68,0.15)',
      '#ef4444',
      { glowColor: 'rgba(239,68,68,0.3)', glowRadius: 8 },
    ),
    draggable: false,
    metadata: { fullText: quiz.opening },
  });

  // Build steps and choices
  for (let si = 0; si < quiz.steps.length; si++) {
    const step = quiz.steps[si];
    const yBase = yStart + (si + 1) * yStepSpacing;

    // Step narrative node
    entities.push({
      id: step.id,
      type: 'scenario-step',
      label: step.narrative.length > 50 ? step.narrative.slice(0, 50) + '…' : step.narrative,
      icon: '📝',
      position: { x: centerX, y: yBase },
      size: { w: 250, h: 48 },
      style: entityStyle('rgba(107,114,128,0.15)', '#6b7280'),
      group: 'step',
      draggable: false,
      metadata: { fullNarrative: step.narrative },
    });

    // Connection from previous element
    if (si === 0) {
      connections.push({
        id: `conn-opening-${step.id}`,
        from: 'opening',
        to: step.id,
        style: connectionStyle('#6b7280', { width: 1.5 }),
        particleConfig: disabledParticles(),
        bidirectional: false,
      });
    }

    // Choice entities spread horizontally
    const choiceCount = step.choices.length;
    for (let ci = 0; ci < choiceCount; ci++) {
      const choice = step.choices[ci];
      const xOffset = (ci - (choiceCount - 1) / 2) * xChoiceSpread;

      entities.push({
        id: choice.id,
        type: 'scenario-choice',
        label: choice.text.length > 40 ? choice.text.slice(0, 40) + '…' : choice.text,
        icon: choice.isOptimal ? '✅' : '🔘',
        position: { x: centerX + xOffset, y: yBase + 60 },
        size: { w: 180, h: 40 },
        style: entityStyle(
          choice.isOptimal ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
          choice.isOptimal ? '#22c55e' : '#6b7280',
        ),
        group: 'choice',
        draggable: false,
        metadata: {
          resultOutput: choice.resultOutput,
          nextStepId: choice.nextStepId,
          isOptimal: choice.isOptimal,
        },
      });

      // Connection from step to choice
      connections.push({
        id: `conn-${step.id}-${choice.id}`,
        from: step.id,
        to: choice.id,
        style: connectionStyle('#374151', { width: 1, opacity: 0.5 }),
        particleConfig: disabledParticles(),
        bidirectional: false,
      });

      // If choice leads to next step, add connection
      if (choice.nextStepId) {
        connections.push({
          id: `conn-${choice.id}-${choice.nextStepId}`,
          from: choice.id,
          to: choice.nextStepId,
          style: connectionStyle('#374151', { width: 1, opacity: 0.3, dashPattern: [4, 4] }),
          particleConfig: disabledParticles(),
          bidirectional: false,
        });
      }
    }
  }

  const interactions = [
    {
      type: 'click' as const,
      sourceFilter: 'choice',
      validate: (action: Record<string, unknown>): InteractionResult => {
        const entityId = String(action['entityId'] ?? '');
        const entity = entities.find((e) => e.id === entityId);
        const isOptimal = entity?.metadata?.isOptimal === true;
        return {
          correct: isOptimal,
          message: isOptimal
            ? '最优选择！'
            : `可以，但不是最佳方案。${entity?.metadata?.resultOutput ?? ''}`,
          highlightIds: [entityId],
        };
      },
    },
  ];

  const maxY = entities.reduce((max, e) => Math.max(max, e.position.y), 0);

  return {
    id: quiz.id,
    title: quiz.opening.length > 50 ? quiz.opening.slice(0, 50) + '…' : quiz.opening,
    sourceType: 'scenario',
    entities,
    connections,
    interactions,
    feedback: defaultFeedback(),
    viewport: defaultViewport(900, Math.max(500, maxY + 100)),
  };
}

/**
 * Highlight the optimal path after scenario completion.
 */
export function highlightOptimalPath(
  scene: VisualScene,
  optimalPath: string[],
): VisualScene {
  const pathSet = new Set(optimalPath);
  return {
    ...scene,
    connections: scene.connections.map((conn) => {
      if (pathSet.has(conn.from) || pathSet.has(conn.to)) {
        return {
          ...conn,
          style: connectionStyle('#22c55e', { width: 2.5 }),
          particleConfig: defaultFlowingParticles('#22c55e'),
        };
      }
      return conn;
    }),
  };
}
