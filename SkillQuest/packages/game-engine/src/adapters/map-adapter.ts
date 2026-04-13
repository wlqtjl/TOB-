/**
 * Map Adapter — LevelMapData → VisualScene
 *
 * Converts the DAG level map into a VisualScene
 * with level nodes as entities and edges as particle-flowing connections.
 * Replaces the SVG stroke-dasharray hack with real particle protocol.
 */

import type { LevelMapData } from '@skillquest/types';
import type { VisualScene } from '../visual-scene';
import {
  entityStyle,
  connectionStyle,
  defaultFlowingParticles,
  defaultPulsingParticles,
  disabledParticles,
  defaultFeedback,
  defaultViewport,
} from '../visual-scene';

const STATUS_STYLES: Record<string, { fill: string; stroke: string; glow?: string }> = {
  passed: { fill: 'rgba(250,204,21,0.2)', stroke: '#facc15', glow: 'rgba(250,204,21,0.5)' },
  unlocked: { fill: 'rgba(59,130,246,0.2)', stroke: '#3b82f6', glow: 'rgba(59,130,246,0.5)' },
  in_progress: { fill: 'rgba(249,115,22,0.2)', stroke: '#f97316', glow: 'rgba(249,115,22,0.5)' },
  locked: { fill: 'rgba(55,65,81,0.5)', stroke: '#374151' },
  failed: { fill: 'rgba(239,68,68,0.1)', stroke: '#ef4444' },
};

const TYPE_ICONS: Record<string, string> = {
  quiz: '📝',
  topology: '🔗',
  terminal: '💻',
  scenario: '🔍',
  ordering: '📋',
  matching: '🔀',
};

const STAR_DISPLAY = ['', '⭐', '⭐⭐', '⭐⭐⭐'];

export function mapAdapter(mapData: LevelMapData): VisualScene {
  const nodeMap = new Map(mapData.nodes.map((n) => [n.levelId, n]));

  const entities = mapData.nodes.map((node) => {
    const statusStyle = STATUS_STYLES[node.status] ?? STATUS_STYLES.locked;
    const isLocked = node.status === 'locked';

    return {
      id: node.levelId,
      type: `level-${node.type}`,
      label: node.title,
      icon: isLocked ? '🔒' : (TYPE_ICONS[node.type] ?? '📝'),
      position: { x: node.x, y: node.y },
      size: { w: 64, h: 64 },
      style: entityStyle(
        statusStyle.fill,
        statusStyle.stroke,
        {
          glowColor: statusStyle.glow,
          glowRadius: statusStyle.glow ? 10 : 0,
          opacity: isLocked ? 0.5 : 1,
        },
      ),
      draggable: false,
      metadata: {
        status: node.status,
        stars: node.stars,
        starsDisplay: STAR_DISPLAY[node.stars] ?? '',
        levelType: node.type,
        clickable: !isLocked,
      },
    };
  });

  const connections = mapData.edges.map((edge, i) => {
    const fromNode = nodeMap.get(edge.fromLevelId);
    const toNode = nodeMap.get(edge.toLevelId);

    // Generate gentle bezier curve
    let bezierControl;
    if (fromNode && toNode) {
      const midX = (fromNode.x + toNode.x) / 2;
      const midY = (fromNode.y + toNode.y) / 2;
      const offset = 20;
      bezierControl = {
        cx1: midX + (i % 2 === 0 ? offset : -offset),
        cy1: midY - offset,
        cx2: midX + (i % 2 === 0 ? -offset : offset),
        cy2: midY + offset,
      };
    }

    let particleConfig;
    let style;

    switch (edge.particleState) {
      case 'flowing':
        particleConfig = defaultFlowingParticles('#FFD700');
        style = connectionStyle('#FFD700', { width: 2 });
        break;
      case 'pulsing':
        particleConfig = defaultPulsingParticles('#3996f6');
        style = connectionStyle('#3996f6', { width: 2 });
        break;
      default:
        particleConfig = disabledParticles();
        style = connectionStyle('#374151', { width: 1, opacity: 0.4 });
        break;
    }

    return {
      id: `edge-${edge.fromLevelId}-${edge.toLevelId}`,
      from: edge.fromLevelId,
      to: edge.toLevelId,
      style,
      particleConfig,
      bezierControl,
      bidirectional: false,
    };
  });

  return {
    id: mapData.courseId,
    title: mapData.courseId,
    sourceType: 'map',
    entities,
    connections,
    interactions: [], // Map is view-only; navigation handled externally
    feedback: defaultFeedback(),
    viewport: defaultViewport(),
  };
}
