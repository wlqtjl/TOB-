import { describe, it, expect } from 'vitest';
import { TopologyEngine } from '../topology-engine';
import type { DeviceNode, Cable, ConnectionPair } from '@skillquest/types';

describe('TopologyEngine', () => {
  // 简单拓扑: PC1 -- SW1 -- Router1 -- SW2 -- PC2
  const nodes: DeviceNode[] = [
    { id: 'PC1', type: 'pc', label: 'PC1', x: 0, y: 0, ports: [{ id: 'PC1-p1', label: 'eth0' }] },
    {
      id: 'SW1', type: 'switch', label: 'SW1', x: 200, y: 0,
      ports: [
        { id: 'SW1-p1', label: 'GE0/0/1' },
        { id: 'SW1-p2', label: 'GE0/0/2' },
      ],
    },
    {
      id: 'R1', type: 'router', label: 'Router1', x: 400, y: 0,
      ports: [
        { id: 'R1-p1', label: 'GE0/0/0' },
        { id: 'R1-p2', label: 'GE0/0/1' },
      ],
    },
    {
      id: 'SW2', type: 'switch', label: 'SW2', x: 600, y: 0,
      ports: [
        { id: 'SW2-p1', label: 'GE0/0/1' },
        { id: 'SW2-p2', label: 'GE0/0/2' },
      ],
    },
    { id: 'PC2', type: 'pc', label: 'PC2', x: 800, y: 0, ports: [{ id: 'PC2-p1', label: 'eth0' }] },
  ];

  const edges: Cable[] = [
    { id: 'c1', fromPortId: 'PC1-p1', toPortId: 'SW1-p1', visible: true },
    { id: 'c2', fromPortId: 'SW1-p2', toPortId: 'R1-p1', visible: true },
    { id: 'c3', fromPortId: 'R1-p2', toPortId: 'SW2-p1', visible: true },
    { id: 'c4', fromPortId: 'SW2-p2', toPortId: 'PC2-p1', visible: true },
  ];

  it('builds adjacency graph with all visible edges', () => {
    const graph = TopologyEngine.buildGraph(nodes, edges);
    expect(graph.size).toBeGreaterThan(0);
    // PC1-p1 should connect to SW1-p1
    expect(graph.get('PC1-p1')?.has('SW1-p1')).toBe(true);
  });

  it('finds path between connected ports via BFS', () => {
    const graph = TopologyEngine.buildGraph(nodes, edges);
    const path = TopologyEngine.findPath(graph, 'PC1-p1', 'PC2-p1');

    expect(path).not.toBeNull();
    expect(path![0]).toBe('PC1-p1');
    expect(path![path!.length - 1]).toBe('PC2-p1');
  });

  it('returns null for disconnected ports', () => {
    // Remove one edge to break connectivity
    const brokenEdges = edges.filter((e) => e.id !== 'c2');
    const graph = TopologyEngine.buildGraph(nodes, brokenEdges);
    const path = TopologyEngine.findPath(graph, 'PC1-p1', 'PC2-p1');

    expect(path).toBeNull();
  });

  it('validates correct connections', () => {
    const correct: ConnectionPair[] = [
      { fromPortId: 'PC1-p1', toPortId: 'SW1-p1' },
      { fromPortId: 'SW1-p2', toPortId: 'R1-p1' },
    ];

    const userConnections: ConnectionPair[] = [
      { fromPortId: 'PC1-p1', toPortId: 'SW1-p1' },
      { fromPortId: 'R1-p1', toPortId: 'SW1-p2' }, // reversed order
    ];

    const result = TopologyEngine.validateConnections(userConnections, correct);
    expect(result.allCorrect).toBe(true);
    expect(result.correct).toBe(2);
  });

  it('generates Bezier control points', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 400, y: 100 },
    ];

    const bezierPoints = TopologyEngine.generateBezierPoints(path);
    expect(bezierPoints.length).toBe(2);
    expect(bezierPoints[0]).toHaveProperty('cx');
    expect(bezierPoints[0]).toHaveProperty('cy');
  });
});
