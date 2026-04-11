/**
 * VM Placement Adapter — VirtualizationLevel → VisualScene
 *
 * Cluster nodes as fixed entities with capacity bars.
 * VMs as draggable entities.
 * Storage/IO paths as connections with data flow particles.
 */

import type { VirtualizationLevel } from '@skillquest/types';
import type { VisualScene, InteractionResult } from '../visual-scene';
import {
  entityStyle,
  connectionStyle,
  disabledParticles,
  defaultFlowingParticles,
  defaultFeedback,
  defaultViewport,
} from '../visual-scene';

const NODE_Y = 120;
const NODE_X_START = 120;
const NODE_X_SPACING = 250;
const VM_Y_START = 320;
const VM_X_START = 100;
const VM_X_SPACING = 140;

export function vmPlacementAdapter(level: VirtualizationLevel): VisualScene {
  // Cluster node entities
  const nodeEntities = level.clusterNodes.map((node, i) => {
    const cpuPct = Math.round((node.cpuUsed / node.cpuTotal) * 100);
    const memPct = Math.round((node.memoryUsedGB / node.memoryTotalGB) * 100);

    const statusColor =
      node.status === 'healthy'
        ? '#22c55e'
        : node.status === 'warning'
          ? '#facc15'
          : '#ef4444';

    return {
      id: node.id,
      type: 'cluster-node',
      label: `${node.label}\nCPU ${cpuPct}% | MEM ${memPct}%`,
      icon: '🖥️',
      position: { x: NODE_X_START + i * NODE_X_SPACING, y: NODE_Y },
      size: { w: 180, h: 80 },
      style: entityStyle(
        `${statusColor}20`,
        statusColor,
        { glowColor: `${statusColor}40`, glowRadius: 6 },
      ),
      group: 'node',
      draggable: false,
      metadata: {
        cpuTotal: node.cpuTotal,
        cpuUsed: node.cpuUsed,
        memoryTotalGB: node.memoryTotalGB,
        memoryUsedGB: node.memoryUsedGB,
        storageTotalTB: node.storageTotalTB,
        storageUsedTB: node.storageUsedTB,
        status: node.status,
      },
    };
  });

  // VM entities (draggable)
  const vmEntities = level.vms.map((vm, i) => ({
    id: vm.id,
    type: 'virtual-machine',
    label: `${vm.name}\n${vm.cpuCores}C / ${vm.memoryGB}G`,
    icon: '📦',
    position: { x: VM_X_START + i * VM_X_SPACING, y: VM_Y_START },
    size: { w: 120, h: 56 },
    style: entityStyle('rgba(168,85,247,0.15)', '#a855f7'),
    group: 'vm',
    draggable: true,
    metadata: {
      cpuCores: vm.cpuCores,
      memoryGB: vm.memoryGB,
      storageSizeGB: vm.storageSizeGB,
      currentNodeId: vm.nodeId,
      status: vm.status,
    },
  }));

  // Existing placement connections (VM → its current node)
  const placementConnections = level.vms
    .filter((vm) => vm.nodeId)
    .map((vm) => ({
      id: `placement-${vm.id}`,
      from: vm.id,
      to: vm.nodeId,
      style: connectionStyle('#a855f7', { width: 1.5, dashPattern: [6, 3] }),
      particleConfig: vm.status === 'running'
        ? defaultFlowingParticles('#a855f7')
        : disabledParticles(),
      bidirectional: false,
    }));

  // Inter-node connections (for replica/migration paths)
  const interNodeConnections = [];
  for (let i = 0; i < level.clusterNodes.length - 1; i++) {
    interNodeConnections.push({
      id: `internode-${i}`,
      from: level.clusterNodes[i].id,
      to: level.clusterNodes[i + 1].id,
      style: connectionStyle('#374151', { width: 1, opacity: 0.3 }),
      particleConfig: disabledParticles(),
      bidirectional: true,
    });
  }

  const interactions = [
    {
      type: 'drag' as const,
      sourceFilter: 'vm',
      targetFilter: 'node',
      validate: (action: Record<string, unknown>): InteractionResult => {
        const vmId = String(action['entityId'] ?? '');
        const targetNodeId = String(action['targetSlot'] ?? '');
        const vm = level.vms.find((v) => v.id === vmId);
        const targetNode = level.clusterNodes.find((n) => n.id === targetNodeId);

        if (!vm || !targetNode) {
          return { correct: false, message: '无效操作' };
        }

        // Check capacity
        const cpuAvailable = targetNode.cpuTotal - targetNode.cpuUsed;
        const memAvailable = targetNode.memoryTotalGB - targetNode.memoryUsedGB;

        if (vm.cpuCores > cpuAvailable || vm.memoryGB > memAvailable) {
          return {
            correct: false,
            message: `${targetNode.label} 资源不足 (CPU: ${cpuAvailable}核可用, 内存: ${memAvailable}GB可用)`,
            highlightIds: [vmId, targetNodeId],
          };
        }

        if (targetNode.status === 'failed') {
          return {
            correct: false,
            message: `${targetNode.label} 已故障，无法放置`,
            highlightIds: [targetNodeId],
          };
        }

        return {
          correct: true,
          message: `${vm.name} 成功放置到 ${targetNode.label}`,
          highlightIds: [vmId, targetNodeId],
        };
      },
    },
  ];

  const maxX = Math.max(
    ...nodeEntities.map((e) => e.position.x + e.size.w),
    ...vmEntities.map((e) => e.position.x + e.size.w),
  );

  return {
    id: level.id,
    title: level.task,
    sourceType: 'vm_placement',
    entities: [...nodeEntities, ...vmEntities],
    connections: [...placementConnections, ...interNodeConnections],
    interactions,
    feedback: defaultFeedback(),
    viewport: defaultViewport(Math.max(900, maxX + 60), 500),
  };
}
