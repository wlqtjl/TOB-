/**
 * Terminal Adapter — TerminalQuizLevel → VisualScene
 *
 * Terminal lines as sequential entities.
 * Blank commands as input-enabled entities.
 * Correct completion triggers success output animation.
 */

import type { TerminalQuizLevel } from '@skillquest/types';
import type { VisualScene, InteractionResult } from '../visual-scene';
import {
  entityStyle,
  connectionStyle,
  disabledParticles,
  defaultFlowingParticles,
  defaultFeedback,
  defaultViewport,
} from '../visual-scene';

const X_POS = 450;
const Y_START = 40;
const Y_SPACING = 50;

export function terminalAdapter(quiz: TerminalQuizLevel): VisualScene {
  const entities: VisualScene['entities'] = [];
  let yPos = Y_START;

  // Existing terminal lines
  for (let i = 0; i < quiz.terminalLines.length; i++) {
    const line = quiz.terminalLines[i];
    entities.push({
      id: `line-${i}`,
      type: 'terminal-line',
      label: `${line.prompt} ${line.command}`,
      icon: '▶',
      position: { x: X_POS, y: yPos },
      size: { w: 700, h: 36 },
      style: entityStyle('rgba(34,197,94,0.1)', '#22c55e', { opacity: 0.8 }),
      group: 'display',
      draggable: false,
      metadata: { prompt: line.prompt, command: line.command, output: line.output },
    });

    if (line.output) {
      yPos += Y_SPACING * 0.6;
      entities.push({
        id: `output-${i}`,
        type: 'terminal-output',
        label: line.output,
        icon: ' ',
        position: { x: X_POS, y: yPos },
        size: { w: 700, h: 30 },
        style: entityStyle('transparent', 'transparent', { opacity: 0.6 }),
        group: 'display',
        draggable: false,
        metadata: {},
      });
    }
    yPos += Y_SPACING;
  }

  // Blank command slots
  for (let i = 0; i < quiz.blankCommands.length; i++) {
    const blank = quiz.blankCommands[i];
    entities.push({
      id: `blank-${i}`,
      type: 'terminal-blank',
      label: `${blank.prompt} ____`,
      icon: '✏️',
      position: { x: X_POS, y: yPos },
      size: { w: 700, h: 40 },
      style: entityStyle('rgba(250,204,21,0.1)', '#facc15'),
      group: 'input',
      draggable: false,
      metadata: {
        prompt: blank.prompt,
        answer: blank.answer,
        hints: blank.hints,
        fuzzyMatch: blank.fuzzyMatch,
        blankIndex: i,
      },
    });
    yPos += Y_SPACING;
  }

  // Sequential connections between all lines (data flow visualization)
  const connections = entities.slice(0, -1).map((ent, i) => ({
    id: `flow-${i}`,
    from: ent.id,
    to: entities[i + 1].id,
    style: connectionStyle('#374151', { width: 1, opacity: 0.2 }),
    particleConfig: disabledParticles(),
    bidirectional: false,
  }));

  const interactions = quiz.blankCommands.map((blank, i) => ({
    type: 'input' as const,
    sourceFilter: 'input',
    validate: (action: Record<string, unknown>): InteractionResult => {
      const value = String(action['value'] ?? '').trim();
      const entityId = String(action['entityId'] ?? '');

      // Simple exact match, or normalize whitespace for fuzzy
      let correct: boolean;
      if (blank.fuzzyMatch) {
        const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
        correct = normalize(value) === normalize(blank.answer);
      } else {
        correct = value === blank.answer;
      }

      return {
        correct,
        message: correct
          ? '命令正确！'
          : `命令不正确。提示: ${blank.hints.join(', ')}`,
        highlightIds: [entityId],
      };
    },
  }));

  return {
    id: quiz.id,
    title: quiz.scenario,
    sourceType: 'terminal',
    entities,
    connections,
    interactions,
    feedback: defaultFeedback(),
    viewport: defaultViewport(900, Math.max(500, yPos + 60)),
  };
}

/**
 * Activate flow particles on terminal chain after all blanks are filled correctly.
 */
export function activateTerminalFlow(scene: VisualScene): VisualScene {
  return {
    ...scene,
    connections: scene.connections.map((conn) => ({
      ...conn,
      particleConfig: defaultFlowingParticles('#22c55e'),
      style: connectionStyle('#22c55e', { width: 1.5, opacity: 0.8 }),
    })),
  };
}
