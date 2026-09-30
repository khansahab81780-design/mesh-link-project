import { describe, it, expect } from 'vitest';
import {
  findShortestPath,
  buildAdjacencyList,
  findReachableNodes,
  calculateAverageHops,
  calculateCoverage,
} from '../utils/routing';
import type { SimulatedDevice } from '../types/mesh';

function createMockDevice(id: string, x: number, y: number, isConnected = true): SimulatedDevice {
  return {
    id,
    displayName: `Device ${id}`,
    position: { x, y },
    bluetoothRange: 15,
    isConnected,
    lastSeen: Date.now(),
    signalStrength: 80,
    hopsAway: 1,
    isActive: isConnected,
    messageBuffer: [],
    processedMessageIds: new Set(),
  };
}

describe('Mesh Routing Algorithms', () => {
  it('builds an adjacency list based on distance and range', () => {
    // A at (0,0), B at (10,0) - distance 10 <= 15 -> connected
    // C at (30,0) - distance to B is 20 > 15 -> not directly connected
    const devA = createMockDevice('A', 0, 0);
    const devB = createMockDevice('B', 10, 0);
    const devC = createMockDevice('C', 30, 0);

    const adj = buildAdjacencyList([devA, devB, devC]);

    expect(adj.get('A')).toContain('B');
    expect(adj.get('A')).not.toContain('C');
    expect(adj.get('B')).toContain('A');
    expect(adj.get('B')).not.toContain('C');
  });

  it('finds the shortest multi-hop path using BFS', () => {
    // Chain: A -> B -> C -> D
    const adj = new Map<string, string[]>([
      ['A', ['B']],
      ['B', ['A', 'C']],
      ['C', ['B', 'D']],
      ['D', ['C']],
    ]);

    const result = findShortestPath('A', 'D', adj);
    expect(result).not.toBeNull();
    expect(result?.path).toEqual(['A', 'B', 'C', 'D']);
    expect(result?.hopCount).toBe(3);
  });

  it('returns unreachable result when destination is unreachable', () => {
    const adj = new Map<string, string[]>([
      ['A', ['B']],
      ['B', ['A']],
      ['C', []],
    ]);

    const result = findShortestPath('A', 'C', adj);
    expect(result.isReachable).toBe(false);
    expect(result.hopCount).toBe(-1);
    expect(result.path).toEqual([]);
  });

  it('identifies all reachable nodes in a partition', () => {
    const adj = new Map<string, string[]>([
      ['A', ['B']],
      ['B', ['A', 'C']],
      ['C', ['B']],
      ['D', ['E']],
      ['E', ['D']],
    ]);

    const reachable = findReachableNodes('A', adj);
    expect(reachable.has('A')).toBe(true);
    expect(reachable.has('B')).toBe(true);
    expect(reachable.has('C')).toBe(true);
    expect(reachable.has('D')).toBe(false);
    expect(reachable.has('E')).toBe(false);
  });

  it('computes coverage percentage accurately', () => {
    const devA = createMockDevice('A', 0, 0);
    const devB = createMockDevice('B', 10, 0);
    const devC = createMockDevice('C', 50, 0);
    const adj = new Map<string, string[]>([
      ['A', ['B']],
      ['B', ['A']],
      ['C', []],
    ]);
    const coverage = calculateCoverage([devA, devB, devC], adj);
    // Largest component has 2 reachable nodes out of 3 active: Math.round(2/3*100) = 67
    expect(coverage).toBe(67);
  });

  it('calculates average hops across reachable peers', () => {
    const devA = createMockDevice('A', 0, 0);
    const devB = createMockDevice('B', 10, 0);
    const devC = createMockDevice('C', 20, 0);
    const adj = new Map<string, string[]>([
      ['A', ['B']],
      ['B', ['A', 'C']],
      ['C', ['B']],
    ]);
    const avg = calculateAverageHops([devA, devB, devC], adj);
    expect(avg).toBeGreaterThan(0);
  });
});
