/**
 * Global Zustand store for MeshLink
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  MeshMessage,
  Peer,
  NetworkStats,
  SimulatorConfig,
  TransportMode,
  BluetoothStatus,
  ConnectionStatus,
  InternetStatus,
  UserIdentity,
  TTLSetting,
  ExpirationSetting,
  BluetoothRangeSetting,
} from '../types/mesh';
import { getOrCreateDeviceId } from '../utils/id';

interface Settings {
  defaultTTL: TTLSetting;
  defaultExpiration: ExpirationSetting;
  defaultBluetoothRange: BluetoothRangeSetting;
  darkMode: boolean;
  displayName: string;
  showDemoMode: boolean;
  messageDelay: number; // ms per hop in simulation
}

interface MeshStore {
  // Identity
  identity: UserIdentity | null;
  setIdentity: (identity: UserIdentity) => void;

  // Connection status
  internetStatus: InternetStatus;
  bluetoothStatus: BluetoothStatus;
  connectionStatus: ConnectionStatus;
  transportMode: TransportMode;
  setInternetStatus: (status: InternetStatus) => void;
  setBluetoothStatus: (status: BluetoothStatus) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setTransportMode: (mode: TransportMode) => void;

  // Peers
  peers: Peer[];
  setPeers: (peers: Peer[]) => void;
  addPeer: (peer: Peer) => void;
  updatePeer: (peer: Peer) => void;
  removePeer: (peerId: string) => void;

  // Messages
  messages: MeshMessage[];
  addMessage: (message: MeshMessage) => void;
  updateMessage: (messageId: string, updates: Partial<MeshMessage>) => void;
  clearMessages: () => void;

  // Active chat
  activeChatPeerId: string | null;
  setActiveChatPeer: (peerId: string | null) => void;

  // Network stats
  networkStats: NetworkStats;
  updateNetworkStats: (stats: Partial<NetworkStats>) => void;

  // Simulator
  simulatorConfig: SimulatorConfig;
  setSimulatorConfig: (config: Partial<SimulatorConfig>) => void;
  simulationRunning: boolean;
  setSimulationRunning: (running: boolean) => void;

  // Settings
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;

  // Demo mode
  demoRunning: boolean;
  setDemoRunning: (running: boolean) => void;
  demoRoute: string[];
  setDemoRoute: (route: string[]) => void;
  demoActiveHop: number;
  setDemoActiveHop: (hop: number) => void;

  // Notifications
  notifications: { id: string; type: 'info' | 'success' | 'warning' | 'error'; message: string; timestamp: number }[];
  addNotification: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  removeNotification: (id: string) => void;
}

const defaultSettings: Settings = {
  defaultTTL: 10,
  defaultExpiration: 60,
  defaultBluetoothRange: 10,
  darkMode: true,
  displayName: '',
  showDemoMode: false,
  messageDelay: 400,
};

const defaultNetworkStats: NetworkStats = {
  totalNodes: 0,
  connectedNodes: 0,
  reachableNodes: 0,
  disconnectedNodes: 0,
  averageHops: 0,
  messagesRelayed: 0,
  messagesDelivered: 0,
  messagesFailed: 0,
  coveragePercent: 0,
  duplicateMessages: 0,
};

export const useMeshStore = create<MeshStore>()(
  persist(
    (set, get) => ({
      // Identity
      identity: null,
      setIdentity: (identity) => set({ identity }),

      // Connection status
      internetStatus: 'online',
      bluetoothStatus: 'unavailable',
      connectionStatus: 'discovering',
      transportMode: 'simulation',
      setInternetStatus: (status) => set({ internetStatus: status }),
      setBluetoothStatus: (status) => set({ bluetoothStatus: status }),
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      setTransportMode: (mode) => set({ transportMode: mode }),

      // Peers
      peers: [],
      setPeers: (peers) => set({ peers }),
      addPeer: (peer) => set(state => ({
        peers: [...state.peers.filter(p => p.id !== peer.id), peer]
      })),
      updatePeer: (peer) => set(state => ({
        peers: state.peers.map(p => p.id === peer.id ? peer : p)
      })),
      removePeer: (peerId) => set(state => ({
        peers: state.peers.filter(p => p.id !== peerId)
      })),

      // Messages
      messages: [],
      addMessage: (message) => set(state => {
        const exists = state.messages.find(m => m.messageId === message.messageId);
        if (exists) return state;
        return { messages: [message, ...state.messages].slice(0, 500) }; // cap at 500
      }),
      updateMessage: (messageId, updates) => set(state => ({
        messages: state.messages.map(m =>
          m.messageId === messageId ? { ...m, ...updates } : m
        )
      })),
      clearMessages: () => set({ messages: [] }),

      // Active chat
      activeChatPeerId: null,
      setActiveChatPeer: (peerId) => set({ activeChatPeerId: peerId }),

      // Network stats
      networkStats: defaultNetworkStats,
      updateNetworkStats: (stats) => set(state => ({
        networkStats: { ...state.networkStats, ...stats }
      })),

      // Simulator
      simulatorConfig: {
        deviceCount: 20,
        bluetoothRange: 10,
        areaSize: 100,
        messageDelay: 400,
      },
      setSimulatorConfig: (config) => set(state => ({
        simulatorConfig: { ...state.simulatorConfig, ...config }
      })),
      simulationRunning: false,
      setSimulationRunning: (running) => set({ simulationRunning: running }),

      // Settings
      settings: defaultSettings,
      updateSettings: (settings) => set(state => ({
        settings: { ...state.settings, ...settings }
      })),

      // Demo mode
      demoRunning: false,
      setDemoRunning: (running) => set({ demoRunning: running }),
      demoRoute: [],
      setDemoRoute: (route) => set({ demoRoute: route }),
      demoActiveHop: -1,
      setDemoActiveHop: (hop) => set({ demoActiveHop: hop }),

      // Notifications
      notifications: [],
      addNotification: (type, message) => set(state => ({
        notifications: [
          ...state.notifications,
          { id: Date.now().toString(), type, message, timestamp: Date.now() }
        ].slice(-5) // keep last 5
      })),
      removeNotification: (id) => set(state => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
    }),
    {
      name: 'meshlink-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        identity: state.identity,
        settings: state.settings,
        messages: state.messages.slice(0, 100), // persist last 100 msgs
      }),
    }
  )
);

// Initialize device identity on first load
export function initializeMeshStore(): UserIdentity {
  const store = useMeshStore.getState();
  if (!store.identity) {
    const deviceId = getOrCreateDeviceId();
    const identity: UserIdentity = {
      deviceId,
      displayName: store.settings.displayName || deviceId,
      createdAt: Date.now(),
    };
    store.setIdentity(identity);
    return identity;
  }
  return store.identity;
}
