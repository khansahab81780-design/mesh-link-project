/**
 * WebBluetoothTransport — Experimental Web Bluetooth API layer
 *
 * ⚠️  IMPORTANT LIMITATIONS:
 * - Web Bluetooth is NOT supported in Firefox, Safari, or most mobile browsers
 * - Web Bluetooth CANNOT run in the background (requires user tab to be open)
 * - Web Bluetooth does NOT support BLE advertising (cannot be discovered)
 * - Web Bluetooth does NOT provide a complete peer-to-peer mesh
 * - This implementation provides BEST-EFFORT connectivity in Chrome/Edge on Android/Desktop
 *
 * For full background BLE mesh, the future Android native app is required.
 *
 * This transport is clearly labeled as EXPERIMENTAL in the UI.
 */

import type { MeshTransport, MeshMessage, Peer, TransportMode } from '../../types/mesh';
import { generateMessageId } from '../../utils/id';
import { calculateExpiresAt } from '../../utils/ttl';

// MeshLink BLE Service UUID (custom)
const MESHLINK_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const MESHLINK_TX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const MESHLINK_RX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

export type BluetoothCapability =
  | 'full' // Web Bluetooth supported
  | 'unavailable' // Not in secure context
  | 'unsupported' // Browser doesn't support Web Bluetooth
  | 'permission-denied'; // User denied permission

interface ConnectedDevice {
  id: string;
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer;
  txChar: BluetoothRemoteGATTCharacteristic;
  rxChar: BluetoothRemoteGATTCharacteristic;
}

class WebBluetoothTransportClass implements MeshTransport {
  private connectedDevices: Map<string, ConnectedDevice> = new Map();
  private messageQueue: MeshMessage[] = [];
  private selfId: string = '';

  // ============================================================
  // Capability detection
  // ============================================================

  static checkCapability(): BluetoothCapability {
    if (!window.isSecureContext) return 'unavailable';
    if (!navigator.bluetooth) return 'unsupported';
    return 'full';
  }

  static isSupported(): boolean {
    return WebBluetoothTransportClass.checkCapability() === 'full';
  }

  getMode(): TransportMode {
    return 'web-bluetooth';
  }

  initialize(selfId: string): void {
    this.selfId = selfId;
  }

  // ============================================================
  // Device discovery (requires user gesture)
  // ============================================================

  /**
   * Request a Bluetooth device (requires user gesture - button click)
   * Cannot scan automatically; user must actively choose a device
   */
  async requestBluetoothDevice(): Promise<BluetoothDevice> {
    if (!WebBluetoothTransportClass.isSupported() || !navigator.bluetooth) {
      throw new Error('Web Bluetooth is not supported in this browser');
    }

    return navigator.bluetooth.requestDevice({
      filters: [
        { services: [MESHLINK_SERVICE_UUID] },
        { namePrefix: 'MeshLink' },
      ],
      optionalServices: [MESHLINK_SERVICE_UUID],
    });
  }

  async discoverPeers(): Promise<Peer[]> {
    // Web Bluetooth cannot scan/advertise — return connected devices only
    return Array.from(this.connectedDevices.values()).map(conn => ({
      id: conn.id,
      displayName: conn.device.name || conn.id,
      position: { x: 50, y: 50 }, // Unknown position via BLE
      bluetoothRange: 10,
      isConnected: conn.server.connected,
      lastSeen: Date.now(),
      signalStrength: -1, // RSSI not available in Web BT
      hopsAway: 1,
    }));
  }

  // ============================================================
  // Connection management
  // ============================================================

  async connectToDevice(device: BluetoothDevice): Promise<void> {
    const server = await device.gatt?.connect();
    if (!server) throw new Error('Failed to connect to GATT server');

    const service = await server.getPrimaryService(MESHLINK_SERVICE_UUID);
    const txChar = await service.getCharacteristic(MESHLINK_TX_CHAR_UUID);
    const rxChar = await service.getCharacteristic(MESHLINK_RX_CHAR_UUID);

    // Subscribe to incoming messages
    await rxChar.startNotifications();
    rxChar.addEventListener('characteristicvaluechanged', (event) => {
      this.handleIncomingData(event);
    });

    device.addEventListener('gattserverdisconnected', () => {
      this.connectedDevices.delete(device.id);
    });

    const connectedDevice: ConnectedDevice = {
      id: device.id,
      device,
      server,
      txChar,
      rxChar,
    };

    this.connectedDevices.set(device.id, connectedDevice);
  }

  async connect(peerId: string): Promise<void> {
    // Connection is initiated via requestBluetoothDevice + connectToDevice
    // This method is a no-op for Web Bluetooth (user must initiate)
    console.warn('[WebBluetooth] Direct connect not supported; use requestBluetoothDevice()');
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    const conn = this.connectedDevices.get(deviceId);
    if (conn) {
      conn.device.gatt?.disconnect();
      this.connectedDevices.delete(deviceId);
    }
  }

  async disconnect(peerId: string): Promise<void> {
    await this.disconnectDevice(peerId);
  }

  // ============================================================
  // Message send/receive
  // ============================================================

  async sendMessage(peerId: string, message: MeshMessage): Promise<void> {
    const conn = this.connectedDevices.get(peerId);
    if (!conn) throw new Error(`Device ${peerId} not connected`);

    const payload = JSON.stringify(message);
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);

    // BLE characteristic write limit is typically 512 bytes (ATT_MTU)
    const CHUNK_SIZE = 512;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      await conn.txChar.writeValueWithResponse(chunk);
    }
  }

  async receiveMessage(): Promise<MeshMessage> {
    return new Promise(resolve => {
      const check = () => {
        if (this.messageQueue.length > 0) {
          resolve(this.messageQueue.shift()!);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  private handleIncomingData(event: Event): void {
    try {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      const value = target.value;
      if (!value) return;

      const decoder = new TextDecoder();
      const text = decoder.decode(value);
      const message: MeshMessage = JSON.parse(text);
      this.messageQueue.push(message);
    } catch (err) {
      console.error('[WebBluetooth] Failed to parse incoming message:', err);
    }
  }

  async scanForSupportedDevices(): Promise<void> {
    // Web Bluetooth cannot scan continuously in the background
    // This would require the user to trigger requestDevice each time
    console.info('[WebBluetooth] Continuous scanning not supported in browser context.');
    console.info('[WebBluetooth] Future native Android app will provide full BLE scanning.');
  }

  async readCharacteristics(deviceId: string): Promise<Record<string, unknown>> {
    const conn = this.connectedDevices.get(deviceId);
    if (!conn) throw new Error('Device not connected');

    const value = await conn.rxChar.readValue();
    const decoder = new TextDecoder();
    return { data: decoder.decode(value) };
  }

  async writeCharacteristic(deviceId: string, data: string): Promise<void> {
    const conn = this.connectedDevices.get(deviceId);
    if (!conn) throw new Error('Device not connected');

    const encoder = new TextEncoder();
    await conn.txChar.writeValueWithResponse(encoder.encode(data));
  }

  // ============================================================
  // Utility
  // ============================================================

  createMessage(
    destinationId: string,
    text: string,
    ttl: number = 10
  ): MeshMessage {
    return {
      messageId: generateMessageId(),
      senderId: this.selfId,
      destinationId,
      timestamp: Date.now(),
      ttl,
      hopCount: 0,
      payload: text,
      route: [this.selfId],
      status: 'pending',
      expiresAt: calculateExpiresAt(60),
      isBroadcast: false,
      displayText: text,
    };
  }

  getConnectedDevices(): ConnectedDevice[] {
    return Array.from(this.connectedDevices.values());
  }

  isConnected(): boolean {
    return this.connectedDevices.size > 0;
  }
}

export const WebBluetoothTransport = new WebBluetoothTransportClass();
export { WebBluetoothTransportClass };
export default WebBluetoothTransport;
