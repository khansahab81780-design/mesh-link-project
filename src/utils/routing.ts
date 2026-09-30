import type { Peer, RouteInfo, SimulatedDevice } from '../types/mesh';

/**
 * Mesh routing utilities using BFS for shortest path
 */

/**
 * Calculate distance between two devices
 */
export function calculateDistance(a: Peer, b: Peer): number {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if two devices are within Bluetooth range of each other
 */
export function areInRange(a: Peer, b: Peer): boolean {
  const distance = calculateDistance(a, b);
  return distance <= Math.min(a.bluetoothRange, b.bluetoothRange);
}

/**
 * Build adjacency list for the mesh network
 */
export function buildAdjacencyList(
  devices: SimulatedDevice[]
): Map<string, string[]> {
  const adj = new Map<string, string[]>();

  for (const device of devices) {
    if (!device.isActive) continue;
    adj.set(device.id, []);
  }

  for (let i = 0; i < devices.length; i++) {
    for (let j = i + 1; j < devices.length; j++) {
      const a = devices[i];
      const b = devices[j];
      if (!a.isActive || !b.isActive) continue;
      if (areInRange(a, b)) {
        adj.get(a.id)?.push(b.id);
        adj.get(b.id)?.push(a.id);
      }
    }
  }

  return adj;
}

/**
 * Find shortest path between two devices using BFS
 */
export function findShortestPath(
  sourceId: string,
  destinationId: string,
  adjacencyList: Map<string, string[]>
): RouteInfo {
  if (sourceId === destinationId) {
    return { path: [sourceId], hopCount: 0, isReachable: true };
  }

  const visited = new Set<string>();
  const queue: { id: string; path: string[] }[] = [
    { id: sourceId, path: [sourceId] }
  ];
  visited.add(sourceId);

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    const neighbors = adjacencyList.get(id) || [];

    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) continue;
      const newPath = [...path, neighborId];

      if (neighborId === destinationId) {
        return {
          path: newPath,
          hopCount: newPath.length - 1,
          isReachable: true,
        };
      }

      visited.add(neighborId);
      queue.push({ id: neighborId, path: newPath });
    }
  }

  return { path: [], hopCount: -1, isReachable: false };
}

/**
 * Find all reachable nodes from a given source
 */
export function findReachableNodes(
  sourceId: string,
  adjacencyList: Map<string, string[]>
): Set<string> {
  const visited = new Set<string>();
  const queue = [sourceId];
  visited.add(sourceId);

  while (queue.length > 0) {
    const id = queue.shift()!;
    const neighbors = adjacencyList.get(id) || [];
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  return visited;
}

/**
 * Calculate network coverage percentage
 */
export function calculateCoverage(
  devices: SimulatedDevice[],
  adjacencyList: Map<string, string[]>
): number {
  const activeDevices = devices.filter(d => d.isActive);
  if (activeDevices.length === 0) return 0;

  // Find the largest connected component
  let maxReachable = 0;
  for (const device of activeDevices) {
    const reachable = findReachableNodes(device.id, adjacencyList);
    maxReachable = Math.max(maxReachable, reachable.size);
  }

  return Math.round((maxReachable / activeDevices.length) * 100);
}

/**
 * Calculate average hop count across all device pairs
 */
export function calculateAverageHops(
  devices: SimulatedDevice[],
  adjacencyList: Map<string, string[]>
): number {
  const activeDevices = devices.filter(d => d.isActive);
  if (activeDevices.length < 2) return 0;

  let totalHops = 0;
  let reachablePairs = 0;

  // Sample a subset for large networks
  const sample = activeDevices.slice(0, Math.min(20, activeDevices.length));

  for (let i = 0; i < sample.length; i++) {
    for (let j = i + 1; j < sample.length; j++) {
      const route = findShortestPath(sample[i].id, sample[j].id, adjacencyList);
      if (route.isReachable) {
        totalHops += route.hopCount;
        reachablePairs++;
      }
    }
  }

  return reachablePairs > 0 ? Math.round((totalHops / reachablePairs) * 10) / 10 : 0;
}
