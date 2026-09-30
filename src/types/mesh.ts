// Core mesh network types

export type TransportMode = 'simulation' | 'web-bluetooth' | 'native-ble';
export type ConnectionStatus = 'connected' | 'discovering' | 'disconnected' | 'no-peers';
export type InternetStatus = 'online' | 'offline';
export type BluetoothStatus = 'available' | 'unavailable' | 'permission-required' | 'unsupported';

export interface DevicePosition {
  x: number; // 0-100 (meters)
  y: number; // 0-100 (meters)
}

export interface Peer {
  id: string;
  displayName: string;
  position: DevicePosition;
  bluetoothRange: number; // meters
  isConnected: boolean;
  lastSeen: number; // timestamp
  signalStrength: number; // 0-100
  hopsAway: number;
  isYou?: boolean;
  isSelf?: boolean;
}

export interface MeshMessage {
  messageId: string;
  senderId: string;
  destinationId: string; // 'broadcast' for broadcast messages
  timestamp: number;
  ttl: number;
  hopCount: number;
  payload: string; // encrypted payload
  route: string[];
  status: MessageStatus;
  expiresAt: number;
  isBroadcast: boolean;
  encryptedPayload?: string;
  signature?: string;
  // Decrypted display fields (only available locally)
  displayText?: string;
  senderDisplayName?: string;
}

export type MessageStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'relayed'
  | 'delivered'
  | 'failed'
  | 'expired'
  | 'duplicate';

export interface NetworkStats {
  totalNodes: number;
  connectedNodes: number;
  reachableNodes: number;
  disconnectedNodes: number;
  averageHops: number;
  messagesRelayed: number;
  messagesDelivered: number;
  messagesFailed: number;
  coveragePercent: number;
  duplicateMessages: number;
}

export interface SimulatorConfig {
  deviceCount: number;
  bluetoothRange: number; // meters
  areaSize: number; // meters (square)
  messageDelay: number; // ms per hop
}

export interface MeshTransport {
  discoverPeers(): Promise<Peer[]>;
  connect(peerId: string): Promise<void>;
  sendMessage(peerId: string, message: MeshMessage): Promise<void>;
  receiveMessage(): Promise<MeshMessage>;
  disconnect(peerId: string): Promise<void>;
  getMode(): TransportMode;
}

export interface UserIdentity {
  deviceId: string;
  displayName: string;
  publicKey?: string;
  privateKey?: string; // stored encrypted
  createdAt: number;
}

export interface SimulatedDevice extends Peer {
  isActive: boolean;
  messageBuffer: MeshMessage[];
  processedMessageIds: Set<string>;
}

export interface RouteInfo {
  path: string[];
  hopCount: number;
  isReachable: boolean;
}

export interface BroadcastMessage extends MeshMessage {
  isBroadcast: true;
  reachedDevices: string[];
}

export type TTLSetting = 5 | 10 | 20 | 50;
export type ExpirationSetting = 10 | 60 | 360 | 1440; // minutes
export type BluetoothRangeSetting = 5 | 10 | 20 | 30; // meters
