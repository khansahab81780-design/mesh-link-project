import React from 'react';
import {
  Radio,
  MessageCircle,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Wifi,
} from 'lucide-react';
import type { Peer } from '../types/mesh';
import { useMeshStore } from '../store/meshStore';

// ─────────────────────────────────────────────────────────────
// Signal strength bars component
// ─────────────────────────────────────────────────────────────

interface SignalBarsProps {
  strength: number; // 0–100
}

function SignalBars({ strength }: SignalBarsProps) {
  // 4 bars, each lights up at 25/50/75/100 thresholds
  const filled = Math.ceil((strength / 100) * 4);

  const barHeights = ['h-2', 'h-3', 'h-4', 'h-5'];
  const activeColor = strength >= 70
    ? 'bg-green-400'
    : strength >= 40
    ? 'bg-orange-400'
    : 'bg-red-400';

  return (
    <div className="flex items-end gap-0.5" title={`Signal: ${strength}%`}>
      {barHeights.map((h, i) => (
        <div
          key={i}
          className={[
            'w-1.5 rounded-sm transition-colors',
            h,
            i < filled ? activeColor : 'bg-gray-700',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hops badge
// ─────────────────────────────────────────────────────────────

function HopsBadge({ hops }: { hops: number }) {
  const color =
    hops === 1
      ? 'text-green-400 bg-green-400/10 border-green-500/20'
      : hops <= 3
      ? 'text-cyan-400 bg-cyan-400/10 border-cyan-500/20'
      : 'text-orange-400 bg-orange-400/10 border-orange-500/20';

  return (
    <span
      className={`px-1.5 py-0.5 rounded-md text-xs font-mono border ${color}`}
      title={`${hops} hop${hops !== 1 ? 's' : ''} away`}
    >
      {hops === 1 ? 'direct' : `${hops} hops`}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Connection dot
// ─────────────────────────────────────────────────────────────

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={[
        'w-2 h-2 rounded-full flex-shrink-0',
        connected ? 'bg-green-400 shadow-sm shadow-green-400' : 'bg-gray-600',
      ].join(' ')}
      title={connected ? 'Connected' : 'Not connected'}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// PeerRow
// ─────────────────────────────────────────────────────────────

interface PeerRowProps {
  peer: Peer;
  isActive: boolean;
  onClick: (id: string) => void;
}

function PeerRow({ peer, isActive, onClick }: PeerRowProps) {
  const initials = peer.displayName.slice(0, 2).toUpperCase();

  return (
    <button
      onClick={() => onClick(peer.id)}
      className={[
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150',
        'text-left border',
        isActive
          ? 'bg-cyan-500/10 border-cyan-500/30'
          : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10',
      ].join(' ')}
    >
      {/* Avatar */}
      <div
        className={[
          'w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center',
          'text-sm font-bold',
          peer.isConnected
            ? 'bg-cyan-500/20 text-cyan-300'
            : 'bg-gray-700/60 text-gray-400',
        ].join(' ')}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={[
              'text-sm font-medium truncate',
              peer.isConnected ? 'text-white' : 'text-gray-400',
            ].join(' ')}
          >
            {peer.displayName}
          </span>
          <ConnectionDot connected={peer.isConnected} />
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500 font-mono truncate">
            {peer.id.slice(0, 8)}…
          </span>
          <HopsBadge hops={peer.hopsAway} />
        </div>
      </div>

      {/* Signal bars */}
      <div className="flex-shrink-0">
        <SignalBars strength={peer.signalStrength} />
      </div>

      {/* Chat icon */}
      <MessageCircle
        size={16}
        className={[
          'flex-shrink-0 transition-colors',
          isActive ? 'text-cyan-400' : 'text-gray-600',
        ].join(' ')}
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────

function EmptyPeers({ isSimulation }: { isSimulation: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
      <div className="relative">
        <Radio size={48} className="text-gray-600" />
        {/* Animated rings */}
        <span className="absolute inset-0 rounded-full border border-gray-700 animate-ping opacity-30" />
        <span className="absolute inset-[-4px] rounded-full border border-gray-800 animate-ping opacity-20 [animation-delay:0.3s]" />
      </div>

      <div>
        <p className="text-gray-300 font-medium">No Peers Discovered</p>
        <p className="text-gray-500 text-sm mt-1">
          {isSimulation
            ? 'Start the simulation to discover virtual peers'
            : 'Looking for nearby devices…'}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PeerList
// ─────────────────────────────────────────────────────────────

export interface PeerListProps {
  className?: string;
  peers?: Peer[];
  activePeerId?: string | null;
  onSelectPeer?: (id: string) => void;
  compact?: boolean;
  showMessages?: boolean;
}

export function PeerList({
  className = '',
  peers: propPeers,
  activePeerId: propActivePeerId,
  onSelectPeer,
  compact = false,
}: PeerListProps) {
  const {
    peers: storePeers,
    activeChatPeerId,
    setActiveChatPeer,
    transportMode,
    identity,
  } = useMeshStore();

  const effectivePeers = propPeers ?? storePeers;
  const effectiveActiveId = propActivePeerId !== undefined ? propActivePeerId : activeChatPeerId;
  const handleSelect = onSelectPeer ?? setActiveChatPeer;

  // Exclude self
  const otherPeers = effectivePeers.filter((p) => !p.isSelf && p.id !== identity?.deviceId);

  const isSimulation = transportMode === 'simulation';

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header (hidden if compact) */}
      {!compact && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Wifi size={14} className="text-cyan-400" />
            <span className="text-sm font-semibold text-white">Nearby Peers</span>
          </div>

          <div className="flex items-center gap-2">
            {isSimulation && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Simulation
              </span>
            )}
            <span className="text-xs text-gray-400">
              {otherPeers.filter((p) => p.isConnected).length}/{otherPeers.length}
            </span>
          </div>
        </div>
      )}

      {/* Peer list or empty state */}
      <div className="flex-1 overflow-y-auto">
        {otherPeers.length === 0 ? (
          <EmptyPeers isSimulation={isSimulation} />
        ) : (
          <div className="p-2 flex flex-col gap-1">
            {/* Sort: connected first, then by signal strength */}
            {[...otherPeers]
              .sort((a, b) => {
                if (a.isConnected !== b.isConnected)
                  return a.isConnected ? -1 : 1;
                return b.signalStrength - a.signalStrength;
              })
              .map((peer) => (
                <PeerRow
                  key={peer.id}
                  peer={peer}
                  isActive={effectiveActiveId === peer.id}
                  onClick={handleSelect}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PeerList;

