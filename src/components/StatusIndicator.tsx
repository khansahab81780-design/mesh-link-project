import React from 'react';
import {
  Wifi,
  WifiOff,
  Bluetooth,
  BluetoothOff,
  Network,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  BatteryCharging,
  Radio,
  Users,
  ArrowUpDown,
  ArrowDownToLine,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useMeshStore } from '../store/meshStore';
import type { BluetoothStatus, ConnectionStatus, InternetStatus } from '../types/mesh';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type StatusVariant =
  | 'online'
  | 'offline'
  | 'warning'
  | 'connected'
  | 'disconnected'
  | 'discovering';

interface StatusBadgeProps {
  label: string;
  value: string;
  status: StatusVariant;
  icon?: React.ReactNode;
  className?: string;
}

interface BatteryState {
  level: number;       // 0–1
  charging: boolean;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function variantStyles(status: StatusVariant): {
  dot: string;
  text: string;
  border: string;
  bg: string;
} {
  switch (status) {
    case 'online':
    case 'connected':
      return {
        dot: 'bg-green-400',
        text: 'text-green-400',
        border: 'border-green-500/30',
        bg: 'bg-green-500/10',
      };
    case 'discovering':
      return {
        dot: 'bg-cyan-400 animate-pulse',
        text: 'text-cyan-400',
        border: 'border-cyan-500/30',
        bg: 'bg-cyan-500/10',
      };
    case 'warning':
      return {
        dot: 'bg-orange-400',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        bg: 'bg-orange-500/10',
      };
    case 'offline':
    case 'disconnected':
    default:
      return {
        dot: 'bg-red-400',
        text: 'text-red-400',
        border: 'border-red-500/30',
        bg: 'bg-red-500/10',
      };
  }
}

// ─────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────

export function StatusBadge({ label, value, status, icon, className = '' }: StatusBadgeProps) {
  const styles = variantStyles(status);

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 rounded-xl
        backdrop-blur-sm border ${styles.border} ${styles.bg}
        ${className}
      `}
    >
      {/* Icon or dot */}
      {icon ? (
        <span className={`flex-shrink-0 ${styles.text}`}>{icon}</span>
      ) : (
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${styles.dot}`} />
      )}

      <div className="min-w-0">
        <p className="text-xs text-gray-400 leading-none mb-0.5 truncate">{label}</p>
        <p className={`text-sm font-semibold leading-none truncate ${styles.text}`}>{value}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Battery hook
// ─────────────────────────────────────────────────────────────

function useBattery(): BatteryState | null {
  const [battery, setBattery] = React.useState<BatteryState | null>(null);

  React.useEffect(() => {
    let manager: { level: number; charging: boolean; onlevelchange: (() => void) | null; onchargingchange: (() => void) | null } | null = null;

    const nav = navigator as Navigator & {
      getBattery?: () => Promise<typeof manager>;
    };

    if (!nav.getBattery) return;

    nav.getBattery().then((bat) => {
      if (!bat) return;
      manager = bat;

      const update = () =>
        setBattery({ level: bat.level, charging: bat.charging });
      update();

      bat.onlevelchange = update;
      bat.onchargingchange = update;
    });

    return () => {
      if (manager) {
        manager.onlevelchange = null;
        manager.onchargingchange = null;
      }
    };
  }, []);

  return battery;
}

// ─────────────────────────────────────────────────────────────
// BatteryIcon helper
// ─────────────────────────────────────────────────────────────

function BatteryIcon({ level, charging }: BatteryState) {
  if (charging) return <BatteryCharging size={16} />;
  if (level <= 0.2) return <BatteryLow size={16} />;
  if (level <= 0.5) return <BatteryMedium size={16} />;
  return <BatteryFull size={16} />;
}

// ─────────────────────────────────────────────────────────────
// Internet status helpers
// ─────────────────────────────────────────────────────────────

function internetStatusVariant(s: InternetStatus): StatusVariant {
  return s === 'online' ? 'online' : 'offline';
}

function internetLabel(s: InternetStatus): string {
  return s === 'online' ? 'Online' : 'Offline';
}

// ─────────────────────────────────────────────────────────────
// Bluetooth status helpers
// ─────────────────────────────────────────────────────────────

function bluetoothStatusVariant(s: BluetoothStatus): StatusVariant {
  switch (s) {
    case 'available':
      return 'connected';
    case 'permission-required':
      return 'warning';
    case 'unavailable':
    case 'unsupported':
    default:
      return 'disconnected';
  }
}

function bluetoothLabel(s: BluetoothStatus): string {
  switch (s) {
    case 'available':
      return 'Available';
    case 'permission-required':
      return 'Need Permission';
    case 'unavailable':
      return 'Unavailable';
    case 'unsupported':
      return 'Unsupported';
  }
}

// ─────────────────────────────────────────────────────────────
// Mesh status helpers
// ─────────────────────────────────────────────────────────────

function meshStatusVariant(s: ConnectionStatus): StatusVariant {
  switch (s) {
    case 'connected':
      return 'connected';
    case 'discovering':
      return 'discovering';
    case 'no-peers':
    case 'disconnected':
    default:
      return 'disconnected';
  }
}

function meshLabel(s: ConnectionStatus): string {
  switch (s) {
    case 'connected':
      return 'Connected';
    case 'discovering':
      return 'Discovering…';
    case 'no-peers':
      return 'No Peers';
    case 'disconnected':
      return 'Disconnected';
  }
}

// ─────────────────────────────────────────────────────────────
// ConnectionStatusBar
// ─────────────────────────────────────────────────────────────

export function ConnectionStatusBar() {
  const {
    internetStatus,
    bluetoothStatus,
    connectionStatus,
    peers,
    networkStats,
    transportMode,
  } = useMeshStore();

  const battery = useBattery();
  const connectedPeers = peers.filter((p) => p.isConnected && !p.isSelf).length;

  return (
    <div className="w-full px-4 py-3">
      {/* Transport mode banner */}
      {transportMode === 'simulation' && (
        <div className="mb-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Radio size={12} className="text-cyan-400 animate-pulse" />
          <span className="text-xs text-cyan-400 font-medium">Simulation Mode Active</span>
        </div>
      )}

      {/* Primary status grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {/* Internet */}
        <StatusBadge
          label="Internet"
          value={internetLabel(internetStatus)}
          status={internetStatusVariant(internetStatus)}
          icon={
            internetStatus === 'online' ? (
              <Wifi size={16} />
            ) : (
              <WifiOff size={16} />
            )
          }
        />

        {/* Bluetooth */}
        <StatusBadge
          label="Bluetooth"
          value={bluetoothLabel(bluetoothStatus)}
          status={bluetoothStatusVariant(bluetoothStatus)}
          icon={
            bluetoothStatus === 'available' ? (
              <Bluetooth size={16} />
            ) : bluetoothStatus === 'permission-required' ? (
              <AlertCircle size={16} />
            ) : (
              <BluetoothOff size={16} />
            )
          }
        />

        {/* Mesh */}
        <StatusBadge
          label="Mesh Network"
          value={meshLabel(connectionStatus)}
          status={meshStatusVariant(connectionStatus)}
          icon={
            connectionStatus === 'connected' ? (
              <CheckCircle2 size={16} />
            ) : connectionStatus === 'discovering' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Network size={16} />
            )
          }
        />

        {/* Nearby Peers */}
        <StatusBadge
          label="Nearby Peers"
          value={`${connectedPeers} peer${connectedPeers !== 1 ? 's' : ''}`}
          status={connectedPeers > 0 ? 'connected' : 'disconnected'}
          icon={<Users size={16} />}
        />

        {/* Messages Relayed */}
        <StatusBadge
          label="Msgs Relayed"
          value={networkStats.messagesRelayed.toString()}
          status="online"
          icon={<ArrowUpDown size={16} />}
        />

        {/* Messages Received */}
        <StatusBadge
          label="Msgs Received"
          value={networkStats.messagesDelivered.toString()}
          status="online"
          icon={<ArrowDownToLine size={16} />}
        />

        {/* Battery (only if supported) */}
        {battery && (
          <StatusBadge
            label="Battery"
            value={`${Math.round(battery.level * 100)}%${battery.charging ? ' ⚡' : ''}`}
            status={
              battery.charging
                ? 'online'
                : battery.level <= 0.2
                ? 'warning'
                : 'online'
            }
            icon={<BatteryIcon level={battery.level} charging={battery.charging} />}
          />
        )}
      </div>
    </div>
  );
}

export default ConnectionStatusBar;
