/**
 * Topology Adapter — TopologyQuizLevel → VisualScene
 *
 * Maps network devices to entities, cables to connections,
 * and generates packet-ball particle flow along Bezier curves.
 */

import type { TopologyQuizLevel } from '@skillquest/types';
import type { VisualScene, InteractionResult } from '../visual-scene';
import {
  entityStyle,
  connectionStyle,
  defaultFlowingParticles,
  disabledParticles,
  defaultFeedback,
  defaultViewport,
} from '../visual-scene';
import { TopologyEngine } from '../topology-engine';

const DEVICE_ICONS: Record<string, string> = {
  pc: '💻',
  router: '🔀',
  switch: '🔗',
  server: '🖥️',
  firewall: '🛡️',
  vm: '📦',
  storage: '💾',
};

export function topologyAdapter(quiz: TopologyQuizLevel): VisualScene {
  // Build port-to-device lookup
  const portToDevice = new Map<string, string>();
  for (const node of quiz.nodes) {
    for (const port of node.ports) {
      portToDevice.set(port.id, node.id);
    }
  }

  // Entities: one per device
  const entities = quiz.nodes.map((node) => ({
    id: node.id,
    type: `device-${node.type}`,
    label: node.label,
    icon: DEVICE_ICONS[node.type] ?? '📡',
    position: { x: node.x, y: node.y },
    size: { w: 64, h: 64 },
    style: entityStyle(
      'rgba(59,130,246,0.2)',
      '#3b82f6',
      { glowColor: 'rgba(59,130,246,0.5)', glowRadius: 8 },
    ),
    draggable: false,
    metadata: {
      ports: node.ports,
      config: node.config,
      deviceType: node.type,
    },
  }));

  // Connections: one per visible cable (mapped from port-level to device-level)
  const connections = quiz.edges
    .filter((e) => e.visible)
    .map((cable) => {
      const fromDeviceId = portToDevice.get(cable.fromPortId) ?? cable.fromPortId;
      const toDeviceId = portToDevice.get(cable.toPortId) ?? cable.toPortId;
      const fromDevice = quiz.nodes.find((n) => n.id === fromDeviceId);
      const toDevice = quiz.nodes.find((n) => n.id === toDeviceId);

      // Generate bezier control if both devices have positions
      let bezierControl;
      if (fromDevice && toDevice) {
        const midX = (fromDevice.x + toDevice.x) / 2;
        const midY = (fromDevice.y + toDevice.y) / 2;
        bezierControl = {
          cx1: midX + 30,
          cy1: midY - 30,
          cx2: midX - 30,
          cy2: midY + 30,
        };
      }

      return {
        id: cable.id,
        from: fromDeviceId,
        to: toDeviceId,
        style: connectionStyle('#3b82f6', { width: 2 }),
        particleConfig: disabledParticles(), // Particles activate after correct answer
        bezierControl,
        bidirectional: true,
      };
    });

  // Interaction: user connects ports
  const correctSet = new Set(
    quiz.correctConnections.map(
      (c) => `${c.fromPortId}:${c.toPortId}`,
    ),
  );

  const interactions = [
    {
      type: 'connect' as const,
      validate: (action: Record<string, unknown>): InteractionResult => {
        const fromId = String(action['fromId'] ?? '');
        const toId = String(action['toId'] ?? '');

        // Single-pair validation: check if this specific pair is in the correct set
        const forward = `${fromId}:${toId}`;
        const reverse = `${toId}:${fromId}`;
        const pairCorrect = correctSet.has(forward) || correctSet.has(reverse);

        return {
          correct: pairCorrect,
          message: pairCorrect ? '连接正确！' : '连接不正确，请重试',
          highlightIds: [fromId, toId],
        };
      },
    },
  ];

  return {
    id: quiz.id,
    title: quiz.task,
    sourceType: 'topology',
    entities,
    connections,
    interactions,
    feedback: defaultFeedback(),
    viewport: defaultViewport(),
  };
}

/**
 * Activate packet-ball flow particles on connections along the correct path.
 * Call this after user solves the topology correctly.
 */
export function activatePacketFlow(
  scene: VisualScene,
  quiz: TopologyQuizLevel,
): VisualScene {
  const animPath = TopologyEngine.computePacketAnimationPath(quiz);
  const pathNodeIds = new Set(animPath.map((p) => p.nodeId));

  return {
    ...scene,
    connections: scene.connections.map((conn) => {
      if (pathNodeIds.has(conn.from) && pathNodeIds.has(conn.to)) {
        return {
          ...conn,
          particleConfig: defaultFlowingParticles('#FFD700'),
        };
      }
      return conn;
    }),
  };
}
