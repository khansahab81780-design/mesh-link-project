/**
 * useMesh — Primary hook for mesh network operations
 */

import { useEffect, useCallback, useRef } from 'react';
import { useMeshStore } from '../store/meshStore';
import { SimulationTransport } from '../services/mesh/SimulationTransport';
import type { SimulationEvent } from '../services/mesh/SimulationTransport';
import { WebBluetoothTransportClass } from '../services/mesh/WebBluetoothTransport';
import type { MeshMessage, BluetoothRangeSetting } from '../types/mesh';
import { saveMessage, getAllMessages } from '../storage/IndexedDB';

export function useMesh() {
  const store = useMeshStore();
  const initializedRef = useRef(false);

  // Initialize simulation transport
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const identity = store.identity;
    if (!identity) return;

    SimulationTransport.initialize(identity.deviceId);
    SimulationTransport.setMessageDelay(store.settings.messageDelay);

    // Generate initial network
    const devices = SimulationTransport.generateSimulatedNetwork(
      store.simulatorConfig.deviceCount,
      store.simulatorConfig.bluetoothRange,
      store.simulatorConfig.areaSize
    );

    store.setPeers(devices.filter(d => !d.isSelf));
    store.setConnectionStatus('connected');

    // Check Web Bluetooth capability
    const btCapability = WebBluetoothTransportClass.checkCapability();
    if (btCapability === 'unsupported') {
      store.setBluetoothStatus('unavailable');
    } else if (btCapability === 'full') {
      store.setBluetoothStatus('available');
    }

    // Load messages from IndexedDB
    getAllMessages().then(msgs => {
      msgs.slice(0, 100).forEach(m => store.addMessage(m));
    }).catch(console.warn);

    // Update network stats
    const stats = SimulationTransport.getNetworkStats();
    store.updateNetworkStats({
      totalNodes: stats.totalNodes,
      connectedNodes: stats.connectedNodes,
      reachableNodes: stats.reachableNodes,
      disconnectedNodes: stats.disconnectedNodes,
      averageHops: stats.averageHops,
      coveragePercent: stats.coveragePercent,
    });
  }, [store.identity?.deviceId]);

  // Listen to simulation events
  useEffect(() => {
    const handleEvent = (event: SimulationEvent) => {
      switch (event.type) {
        case 'message-sent':
        case 'message-relayed':
        case 'message-delivered':
        case 'message-failed': {
          const data = event.data as { message: MeshMessage } | MeshMessage;
          const msg = 'message' in (data as object) ? (data as { message: MeshMessage }).message : data as MeshMessage;
          if (msg?.messageId) {
            store.addMessage(msg);
            store.updateMessage(msg.messageId, { status: msg.status });
            saveMessage(msg).catch(console.warn);
          }

          const stats = SimulationTransport.getNetworkStats();
          store.updateNetworkStats({
            messagesRelayed: stats.messagesRelayed,
            messagesDelivered: stats.messagesDelivered,
          });
          break;
        }
        case 'topology-changed': {
          const devices = SimulationTransport.getAllDevices();
          store.setPeers(devices.filter(d => !d.isSelf && !(d as { isYou?: boolean }).isYou));
          const stats = SimulationTransport.getNetworkStats();
          store.updateNetworkStats({
            totalNodes: stats.totalNodes,
            connectedNodes: stats.connectedNodes,
            reachableNodes: stats.reachableNodes,
            disconnectedNodes: stats.disconnectedNodes,
            averageHops: stats.averageHops,
            coveragePercent: stats.coveragePercent,
          });
          break;
        }
        case 'peer-added':
        case 'peer-updated': {
          const peer = event.data as { id: string };
          if (peer?.id) {
            store.updatePeer(peer as Parameters<typeof store.updatePeer>[0]);
          }
          break;
        }
      }
    };

    SimulationTransport.addEventListener(handleEvent);
    return () => SimulationTransport.removeEventListener(handleEvent);
  }, []);

  // ============================================================
  // Actions
  // ============================================================

  const sendMessage = useCallback(async (
    destinationId: string,
    text: string,
    isBroadcast: boolean = false
  ): Promise<MeshMessage | null> => {
    try {
      const msg = await SimulationTransport.sendMeshMessage(
        destinationId,
        text,
        store.settings.defaultTTL,
        store.settings.defaultExpiration,
        isBroadcast
      );
      await saveMessage(msg).catch(console.warn);
      store.addNotification('success', isBroadcast ? 'Broadcast sent!' : `Message sent to ${destinationId}`);
      return msg;
    } catch (err) {
      console.error('[useMesh] sendMessage error:', err);
      store.addNotification('error', 'Failed to send message');
      return null;
    }
  }, [store.settings.defaultTTL, store.settings.defaultExpiration]);

  const regenerateNetwork = useCallback((
    deviceCount?: number,
    range?: number
  ) => {
    const count = deviceCount ?? store.simulatorConfig.deviceCount;
    const bluetoothRange = range ?? store.simulatorConfig.bluetoothRange;

    const devices = SimulationTransport.generateSimulatedNetwork(
      count, bluetoothRange, store.simulatorConfig.areaSize
    );
    store.setPeers(devices.filter(d => !d.isSelf && !(d as { isYou?: boolean }).isYou));
    store.addNotification('info', `Network regenerated with ${count} devices`);
  }, [store.simulatorConfig]);

  const updateBluetoothRange = useCallback((range: BluetoothRangeSetting) => {
    SimulationTransport.updateBluetoothRange(range);
    store.setSimulatorConfig({ bluetoothRange: range });
  }, []);

  const simulateNetworkFailure = useCallback(() => {
    SimulationTransport.simulateNetworkFailure();
    store.addNotification('warning', 'Network failure simulated — some nodes disconnected');
  }, []);

  const resetNetwork = useCallback(() => {
    SimulationTransport.resetNetwork();
    store.clearMessages();
    store.addNotification('info', 'Network reset');
  }, []);

  const disableRandomNodes = useCallback((count: number) => {
    const disabled = SimulationTransport.disableRandomNodes(count);
    store.addNotification('warning', `${disabled.length} nodes disabled`);
  }, []);

  const runDemo = useCallback(async () => {
    store.setDemoRunning(true);
    const devices = SimulationTransport.getAllSimulatedDevices();
    if (devices.length < 5) {
      SimulationTransport.generateSimulatedNetwork(20, 10, 100);
    }

    // Find a long route for demo
    const adj = SimulationTransport.getAdjacencyList();
    const selfId = SimulationTransport.getSelfId();
    const nonSelfDevices = devices.filter(d => d.id !== selfId);

    if (nonSelfDevices.length === 0) {
      store.setDemoRunning(false);
      return;
    }

    const target = nonSelfDevices[Math.floor(nonSelfDevices.length * 0.8)];

    const { findShortestPath } = await import('../utils/routing');
    const route = findShortestPath(selfId, target.id, adj);

    if (!route.isReachable || route.path.length < 2) {
      store.addNotification('warning', 'Demo: no long route found, regenerating...');
      SimulationTransport.generateSimulatedNetwork(20, 10, 100);
      store.setDemoRunning(false);
      return;
    }

    store.setDemoRoute(route.path);
    store.setDemoActiveHop(0);

    // Animate hop by hop
    for (let i = 0; i <= route.path.length; i++) {
      await new Promise<void>(r => setTimeout(r, 800));
      store.setDemoActiveHop(i);
    }

    store.addNotification(
      'success',
      `Demo: Message delivered in ${route.path.length - 1} hops through ${route.path.length} nodes!`
    );

    await new Promise<void>(r => setTimeout(r, 2000));
    store.setDemoRunning(false);
    store.setDemoRoute([]);
    store.setDemoActiveHop(-1);
  }, []);

  return {
    // State
    identity: store.identity,
    peers: store.peers,
    messages: store.messages,
    networkStats: store.networkStats,
    connectionStatus: store.connectionStatus,
    internetStatus: store.internetStatus,
    bluetoothStatus: store.bluetoothStatus,
    transportMode: store.transportMode,
    settings: store.settings,
    demoRunning: store.demoRunning,
    demoRoute: store.demoRoute,
    demoActiveHop: store.demoActiveHop,

    // Actions
    sendMessage,
    regenerateNetwork,
    updateBluetoothRange,
    simulateNetworkFailure,
    resetNetwork,
    disableRandomNodes,
    runDemo,

    // Direct transport access
    transport: SimulationTransport,
  };
}
