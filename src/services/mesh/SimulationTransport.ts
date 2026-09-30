/**
 * SimulationTransport — In-memory mesh network simulation
 *
 * Implements MeshTransport interface for browser-side demo.
 * Provides realistic store-and-forward routing, TTL, deduplication,
 * and animated message propagation.
 *
 * This is clearly labeled as SIMULATION MODE.
 * Future: NativeBLETransport will replace this for real BLE mesh.
 */

import type {
  MeshTransport,
  MeshMessage,
  Peer,
  SimulatedDevice,
  TransportMode,
} from '../../types/mesh';
import { generateMessageId, generateSimulatedDeviceId, getSimulatedDeviceName } from '../../utils/id';
import { processMessageForRelay, calculateExpiresAt } from '../../utils/ttl';
import {
  buildAdjacencyList,
  findShortestPath,
  calculateCoverage,
  calculateAverageHops,
} from '../../utils/routing';

export type SimulationEventType =
  | 'peer-added'
  | 'peer-removed'
  | 'peer-updated'
  | 'message-sent'
  | 'message-received'
  | 'message-relayed'
  | 'message-delivered'
  | 'message-failed'
  | 'topology-changed';

export interface SimulationEvent {
  type: SimulationEventType;
  data: unknown;
  timestamp: number;
}

type EventListener = (event: SimulationEvent) => void;

class SimulationTransportClass implements MeshTransport {
  private devices: Map<string, SimulatedDevice> = new Map();
  private processedMessageIds: Set<string> = new Set();
  private pendingMessages: MeshMessage[] = [];
  private eventListeners: EventListener[] = [];
  private selfId: string = '';
  private messageDelay: number = 300; // ms per hop
  private relayCount: number = 0;
  private deliveryCount: number = 0;
  private duplicateCount: number = 0;
  private failedCount: number = 0;

  // ============================================================
  // Setup
  // ============================================================

  initialize(selfId: string): void {
    this.selfId = selfId;
    // Add self as a device
    const selfDevice: SimulatedDevice = {
      id: selfId,
      displayName: 'You',
      position: { x: 50, y: 50 },
      bluetoothRange: 10,
      isConnected: true,
      lastSeen: Date.now(),
      signalStrength: 100,
      hopsAway: 0,
      isYou: true,
      isSelf: true,
      isActive: true,
      messageBuffer: [],
      processedMessageIds: new Set(),
    };
    this.devices.set(selfId, selfDevice);
  }

  generateSimulatedNetwork(
    deviceCount: number,
    bluetoothRange: number = 10,
    areaSize: number = 100
  ): SimulatedDevice[] {
    // Keep self
    const selfDevice = this.devices.get(this.selfId);
    this.devices.clear();
    if (selfDevice) {
      selfDevice.bluetoothRange = bluetoothRange;
      this.devices.set(this.selfId, selfDevice);
    }

    for (let i = 0; i < deviceCount; i++) {
      const id = generateSimulatedDeviceId(i);
      const device: SimulatedDevice = {
        id,
        displayName: getSimulatedDeviceName(i),
        position: {
          x: Math.random() * areaSize,
          y: Math.random() * areaSize,
        },
        bluetoothRange,
        isConnected: true,
        lastSeen: Date.now(),
        signalStrength: Math.floor(Math.random() * 40 + 60),
        hopsAway: -1, // calculated later
        isActive: true,
        messageBuffer: [],
        processedMessageIds: new Set(),
      };
      this.devices.set(id, device);
    }

    this.updateHopCounts();
    this.emitEvent('topology-changed', { devices: this.getAllDevices() });
    return this.getAllSimulatedDevices();
  }

  private updateHopCounts(): void {
    const devices = this.getAllSimulatedDevices();
    const adj = buildAdjacencyList(devices);
    const reachable = this.findAllReachableWithHops(this.selfId, adj);
    for (const [id, hops] of reachable) {
      const device = this.devices.get(id);
      if (device) {
        device.hopsAway = hops;
        device.isConnected = true;
      }
    }
    // Mark unreachable devices
    for (const [id, device] of this.devices) {
      if (!reachable.has(id) && id !== this.selfId) {
        device.hopsAway = -1;
        device.isConnected = false;
      }
    }
  }

  private findAllReachableWithHops(
    sourceId: string,
    adj: Map<string, string[]>
  ): Map<string, number> {
    const result = new Map<string, number>();
    const queue: { id: string; hops: number }[] = [{ id: sourceId, hops: 0 }];
    result.set(sourceId, 0);

    while (queue.length > 0) {
      const { id, hops } = queue.shift()!;
      for (const neighborId of adj.get(id) || []) {
        if (!result.has(neighborId)) {
          result.set(neighborId, hops + 1);
          queue.push({ id: neighborId, hops: hops + 1 });
        }
      }
    }

    return result;
  }

  // ============================================================
  // MeshTransport interface
  // ============================================================

  getMode(): TransportMode {
    return 'simulation';
  }

  async discoverPeers(): Promise<Peer[]> {
    return this.getAllDevices().filter(d => d.id !== this.selfId);
  }

  async connect(peerId: string): Promise<void> {
    const device = this.devices.get(peerId);
    if (device) {
      device.isConnected = true;
      device.isActive = true;
      this.emitEvent('peer-updated', device);
    }
  }

  async disconnect(peerId: string): Promise<void> {
    const device = this.devices.get(peerId);
    if (device) {
      device.isConnected = false;
      device.isActive = false;
      this.emitEvent('peer-updated', device);
      this.updateHopCounts();
      this.emitEvent('topology-changed', { devices: this.getAllDevices() });
    }
  }

  async sendMessage(peerId: string, message: MeshMessage): Promise<void> {
    this.emitEvent('message-sent', message);
    await this.routeMessage(message);
  }

  async receiveMessage(): Promise<MeshMessage> {
    return new Promise(resolve => {
      const check = () => {
        if (this.pendingMessages.length > 0) {
          resolve(this.pendingMessages.shift()!);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  // ============================================================
  // Store-and-Forward Routing
  // ============================================================

  async sendMeshMessage(
    destinationId: string,
    text: string,
    ttl: number = 10,
    expirationMinutes: number = 60,
    isBroadcast: boolean = false
  ): Promise<MeshMessage> {
    const message: MeshMessage = {
      messageId: generateMessageId(),
      senderId: this.selfId,
      destinationId,
      timestamp: Date.now(),
      ttl,
      hopCount: 0,
      payload: text,
      route: [this.selfId],
      status: 'sending',
      expiresAt: calculateExpiresAt(expirationMinutes),
      isBroadcast,
      displayText: text,
    };

    this.processedMessageIds.add(message.messageId);
    this.emitEvent('message-sent', { ...message });

    await this.routeMessage(message);
    return message;
  }

  private async routeMessage(message: MeshMessage): Promise<void> {
    const devices = this.getAllSimulatedDevices();
    const adj = buildAdjacencyList(devices);

    if (message.isBroadcast) {
      await this.broadcastMessage(message, adj);
    } else {
      await this.unicastMessage(message, adj);
    }
  }

  private async unicastMessage(
    message: MeshMessage,
    adj: Map<string, string[]>
  ): Promise<void> {
    const route = findShortestPath(this.selfId, message.destinationId, adj);

    if (!route.isReachable) {
      this.failedCount++;
      this.emitEvent('message-failed', {
        ...message,
        status: 'failed',
        reason: 'No route to destination',
      });
      return;
    }

    // Animate message traveling along the route
    let delay = 0;
    for (let i = 1; i < route.path.length; i++) {
      const hopMessage: MeshMessage = {
        ...message,
        hopCount: i,
        ttl: message.ttl - i,
        route: route.path.slice(0, i + 1),
        status: i === route.path.length - 1 ? 'delivered' : 'relayed',
      };

      await new Promise<void>(resolve => {
        setTimeout(() => {
          if (i < route.path.length - 1) {
            this.relayCount++;
            this.emitEvent('message-relayed', {
              message: hopMessage,
              fromDevice: route.path[i - 1],
              toDevice: route.path[i],
            });
          } else {
            this.deliveryCount++;
            this.emitEvent('message-delivered', {
              message: hopMessage,
              finalDevice: route.path[i],
            });
          }
          resolve();
        }, delay);
      });

      delay += this.messageDelay;
    }
  }

  private async broadcastMessage(
    message: MeshMessage,
    adj: Map<string, string[]>
  ): Promise<void> {
    const visited = new Set<string>([message.senderId]);
    const queue: { deviceId: string; msg: MeshMessage }[] = [];

    // Get direct neighbors
    const neighbors = adj.get(message.senderId) || [];
    for (const neighborId of neighbors) {
      queue.push({ deviceId: neighborId, msg: { ...message } });
    }

    let delay = this.messageDelay;

    const processNext = async () => {
      if (queue.length === 0) return;

      const { deviceId, msg } = queue.shift()!;
      if (visited.has(deviceId)) {
        this.duplicateCount++;
        setTimeout(processNext, 0);
        return;
      }
      visited.add(deviceId);

      const relayed = processMessageForRelay(msg, deviceId);
      if (!relayed) {
        setTimeout(processNext, 0);
        return;
      }

      await new Promise<void>(resolve => {
        setTimeout(() => {
          this.relayCount++;
          this.emitEvent('message-relayed', {
            message: relayed,
            fromDevice: msg.route[msg.route.length - 1],
            toDevice: deviceId,
            reachedCount: visited.size,
          });

          // Enqueue neighbors for relay
          const nextNeighbors = adj.get(deviceId) || [];
          for (const nextId of nextNeighbors) {
            if (!visited.has(nextId)) {
              queue.push({ deviceId: nextId, msg: relayed });
            }
          }

          resolve();
        }, delay);
      });

      delay += this.messageDelay / 2;
      await processNext();
    };

    await processNext();

    this.emitEvent('message-delivered', {
      message,
      reachedDevices: Array.from(visited),
      reachedCount: visited.size,
    });
  }

  // ============================================================
  // Device management
  // ============================================================

  addDevice(device: Partial<SimulatedDevice> & { id: string }): SimulatedDevice {
    const newDevice: SimulatedDevice = {
      displayName: device.displayName || device.id,
      position: device.position || { x: Math.random() * 100, y: Math.random() * 100 },
      bluetoothRange: device.bluetoothRange || 10,
      isConnected: true,
      lastSeen: Date.now(),
      signalStrength: 80,
      hopsAway: -1,
      isActive: true,
      messageBuffer: [],
      processedMessageIds: new Set(),
      ...device,
    };
    this.devices.set(newDevice.id, newDevice);
    this.updateHopCounts();
    this.emitEvent('peer-added', newDevice);
    this.emitEvent('topology-changed', { devices: this.getAllDevices() });
    return newDevice;
  }

  removeDevice(deviceId: string): void {
    this.devices.delete(deviceId);
    this.updateHopCounts();
    this.emitEvent('peer-removed', { id: deviceId });
    this.emitEvent('topology-changed', { devices: this.getAllDevices() });
  }

  updateDevicePosition(deviceId: string, x: number, y: number): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.position = { x, y };
      this.updateHopCounts();
      this.emitEvent('peer-updated', device);
      this.emitEvent('topology-changed', { devices: this.getAllDevices() });
    }
  }

  updateBluetoothRange(range: number): void {
    for (const device of this.devices.values()) {
      device.bluetoothRange = range;
    }
    this.updateHopCounts();
    this.emitEvent('topology-changed', { devices: this.getAllDevices() });
  }

  disableRandomNodes(count: number): string[] {
    const activeDevices = this.getAllSimulatedDevices()
      .filter(d => d.isActive && d.id !== this.selfId);
    const toDisable = activeDevices
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    for (const device of toDisable) {
      device.isActive = false;
      device.isConnected = false;
    }

    this.updateHopCounts();
    this.emitEvent('topology-changed', { devices: this.getAllDevices() });
    return toDisable.map(d => d.id);
  }

  simulateNetworkFailure(): void {
    const activeDevices = this.getAllSimulatedDevices()
      .filter(d => d.isActive && d.id !== this.selfId);
    const failCount = Math.floor(activeDevices.length * 0.3);
    this.disableRandomNodes(failCount);
  }

  resetNetwork(): void {
    for (const device of this.devices.values()) {
      device.isActive = true;
      device.isConnected = true;
      device.messageBuffer = [];
      device.processedMessageIds = new Set();
    }
    this.processedMessageIds.clear();
    this.relayCount = 0;
    this.deliveryCount = 0;
    this.duplicateCount = 0;
    this.failedCount = 0;
    this.updateHopCounts();
    this.emitEvent('topology-changed', { devices: this.getAllDevices() });
  }

  // ============================================================
  // Network stats
  // ============================================================

  getNetworkStats() {
    const devices = this.getAllSimulatedDevices();
    const adj = buildAdjacencyList(devices);
    const activeDevices = devices.filter(d => d.isActive);
    const connectedDevices = devices.filter(d => d.isConnected);

    return {
      totalNodes: devices.length,
      connectedNodes: connectedDevices.length,
      activeNodes: activeDevices.length,
      disconnectedNodes: devices.length - activeDevices.length,
      averageHops: calculateAverageHops(devices, adj),
      messagesRelayed: this.relayCount,
      messagesDelivered: this.deliveryCount,
      messagesFailed: this.failedCount,
      duplicateMessages: this.duplicateCount,
      coveragePercent: calculateCoverage(devices, adj),
      reachableNodes: activeDevices.length > 0
        ? Math.floor(calculateCoverage(devices, adj) * activeDevices.length / 100)
        : 0,
    };
  }

  getAdjacencyList(): Map<string, string[]> {
    return buildAdjacencyList(this.getAllSimulatedDevices());
  }

  // ============================================================
  // Helpers
  // ============================================================

  getAllDevices(): Peer[] {
    return Array.from(this.devices.values());
  }

  getAllSimulatedDevices(): SimulatedDevice[] {
    return Array.from(this.devices.values());
  }

  getDevice(id: string): SimulatedDevice | undefined {
    return this.devices.get(id);
  }

  getSelfId(): string {
    return this.selfId;
  }

  setMessageDelay(ms: number): void {
    this.messageDelay = ms;
  }

  // ============================================================
  // Event system
  // ============================================================

  addEventListener(listener: EventListener): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: EventListener): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }

  private emitEvent(type: SimulationEventType, data: unknown): void {
    const event: SimulationEvent = { type, data, timestamp: Date.now() };
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.warn('[SimulationTransport] Event listener error:', err);
      }
    }
  }
}

export const SimulationTransport = new SimulationTransportClass();
export default SimulationTransport;
