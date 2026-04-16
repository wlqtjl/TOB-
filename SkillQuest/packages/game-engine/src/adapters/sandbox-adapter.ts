/**
 * Sandbox Adapter — SandboxLevel → VisualScene
 *
 * GPSL v1.1: Converts a Gemini-generated sandbox simulation config
 * into the universal VisualScene protocol for rendering.
 *
 * The sandbox adapter creates a central "experiment" entity surrounded
 * by variable "knob" entities that represent adjustable parameters.
 */

import type { SandboxLevel } from '@skillquest/types';
import type { VisualScene, InteractionResult } from '../visual-scene';
import {
  entityStyle,
  connectionStyle,
  disabledParticles,
  defaultFlowingParticles,
  defaultFeedback,
  defaultViewport,
} from '../visual-scene';

export function sandboxAdapter(level: SandboxLevel): VisualScene {
  const viewport = defaultViewport();
  const centerX = viewport.width / 2;
  const centerY = viewport.height * 0.4;
  const radius = Math.min(viewport.width, viewport.height) * 0.3;
  const variables = level.simConfig.variables;

  // Central experiment entity
  const experimentEntity = {
    id: 'sandbox-center',
    type: 'experiment',
    label: level.task,
    icon: '🧪',
    position: { x: centerX, y: centerY },
    size: { w: 140, h: 140 },
    style: entityStyle(
      'rgba(79,70,229,0.15)',
      '#4F46E5',
      { glowColor: 'rgba(79,70,229,0.4)', glowRadius: 14 },
    ),
    draggable: false,
    metadata: {
      modelType: level.simConfig.modelType,
      formula: level.simConfig.mathFormula,
      engineType: level.simConfig.engineType ?? 'generic',
    },
  };

  // Variable knob entities arranged radially
  const variableEntities = variables.map((v, i) => {
    const angle = (2 * Math.PI * i) / variables.length - Math.PI / 2;
    return {
      id: `var-${v.name}`,
      type: 'variable',
      label: `${v.label}: ${v.default}${v.unit ? ' ' + v.unit : ''}`,
      icon: '🎛️',
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
      size: { w: 160, h: 44 },
      style: entityStyle('rgba(16,185,129,0.15)', '#10B981'),
      group: 'variable',
      draggable: false,
      metadata: {
        variableName: v.name,
        min: v.min,
        max: v.max,
        default: v.default,
        unit: v.unit ?? '',
      },
    };
  });

  // Connections from variables to center
  const connections = variableEntities.map((ve) => ({
    id: `conn-${ve.id}`,
    from: ve.id,
    to: 'sandbox-center',
    style: connectionStyle('#10B981', { width: 1.5, opacity: 0.4 }),
    particleConfig: defaultFlowingParticles('#10B981'),
    bidirectional: false,
  }));

  // Objective entity at top
  const objectiveEntity = {
    id: 'sandbox-objective',
    type: 'objective',
    label: level.objective,
    icon: '🎯',
    position: { x: centerX, y: 40 },
    size: { w: 300, h: 36 },
    style: entityStyle('rgba(217,119,6,0.1)', '#D97706'),
    draggable: false,
    metadata: {},
  };

  const interactions = [
    {
      type: 'click' as const,
      sourceFilter: 'variable',
      validate: (action: Record<string, unknown>): InteractionResult => {
        const entityId = String(action['entityId'] ?? '');
        return {
          correct: true,
          message: `调节参数: ${entityId}`,
          highlightIds: [entityId, 'sandbox-center'],
        };
      },
    },
  ];

  return {
    id: level.id,
    title: level.task,
    sourceType: 'sandbox',
    entities: [objectiveEntity, experimentEntity, ...variableEntities],
    connections,
    interactions,
    feedback: defaultFeedback(),
    viewport: defaultViewport(),
  };
}

/**
 * Update variable entity labels when parameters change
 */
export function updateSandboxVariables(
  scene: VisualScene,
  values: Record<string, number>,
  variables: { name: string; label: string; unit?: string }[],
): VisualScene {
  const varMap = new Map(variables.map((v) => [v.name, v]));
  return {
    ...scene,
    entities: scene.entities.map((ent) => {
      if (ent.type === 'variable' && ent.metadata?.['variableName']) {
        const name = ent.metadata['variableName'] as string;
        const def = varMap.get(name);
        const val = values[name];
        if (def && val !== undefined) {
          return {
            ...ent,
            label: `${def.label}: ${val}${def.unit ? ' ' + def.unit : ''}`,
          };
        }
      }
      return ent;
    }),
  };
}
