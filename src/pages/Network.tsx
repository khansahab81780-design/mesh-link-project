/**
 * Network.tsx — MeshLink Network Topology Page
 *
 * Full-screen topology view with live stats, failure simulation,
 * and adjacency list display.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Network as NetworkIcon,
  AlertTriangle,
  RefreshCw,
  Activity,
  Cpu,
  Link,
  Unlink,
  Radio,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Map as MapIcon,
} from 'lucide-react';
import { useMesh } from '../hooks/useMesh';
import { useMeshStore } from '../store/meshStore';
import { SimulationTransport } from '../services/mesh/SimulationTransport';
import NetworkGraph from '../components/NetworkGraph';

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

function StatCard({ label, value, sub, icon: Icon, color, bg }: StatCardProps) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl bg-gray-900 border border-white/10`}>
      <div className={`p-2.5 rounded-xl ${bg}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <p className="text-gray-500 text-xs">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-gray-600 text-xs">{sub}</p>}
      </div>
    </div>
  );
}

// ── Adjacency List Panel ───────────────────────────────────────────────────────

function AdjacencyPanel({ adjacency }: { adjacency: Map<string, string[]> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Array.from(adjacency.entries()).slice(0, expanded ? undefined : 8);

  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Link className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-gray-200">Adjacency List</span>
          <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
            {adjacency.size} nodes
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      <div className="px-4 py-3 space-y-2 font-mono text-xs overflow-x-auto">
        {entries.map(([nodeId, neighbors]) => (
          <div key={nodeId} className="flex gap-2 min-w-0">
            <span className="text-cyan-400 shrink-0 w-24 truncate">{nodeId.slice(0, 8)}…</span>
            <span className="text-gray-600 shrink-0">→</span>
            <span className="text-gray-400 truncate">
              {neighbors.length === 0 ? (
                <span className="text-red-500/60">no connections</span>
              ) : (
                neighbors.map((n) => n.slice(0, 6)).join(', ')
              )}
            </span>
            <span className="text-gray-700 shrink-0 ml-auto pl-2">
              [{neighbors.length}]
            </span>
          </div>
        ))}
        {!expanded && adjacency.size > 8 && (
          <p className="text-gray-600 pt-1">
            … and {adjacency.size - 8} more nodes. Click to expand.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const Network: React.FC = () => {
  const { simulateNetworkFailure, regenerateNetwork, demoRoute, demoActiveHop } = useMesh();
  const { networkStats, peers, addNotification } = useMeshStore();
  const [adjacency, setAdjacency] = useState<Map<string, string[]>>(new Map());
  const [isSimulatingFailure, setIsSimulatingFailure] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Load adjacency list on mount and when peers change
  useEffect(() => {
    setAdjacency(SimulationTransport.getAdjacencyList());
  }, [peers.length, networkStats.connectedNodes]);

  // Live-refresh stats
  useEffect(() => {
    const interval = setInterval(() => {
      setAdjacency(SimulationTransport.getAdjacencyList());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateFailure = useCallback(async () => {
    setIsSimulatingFailure(true);
    simulateNetworkFailure();
    await new Promise<void>((r) => setTimeout(r, 800));
    setAdjacency(SimulationTransport.getAdjacencyList());
    setIsSimulatingFailure(false);
  }, [simulateNetworkFailure]);

  const handleRegenerate = useCallback(async () => {
    setIsRegenerating(true);
    regenerateNetwork();
    await new Promise<void>((r) => setTimeout(r, 600));
    setAdjacency(SimulationTransport.getAdjacencyList());
    setIsRegenerating(false);
    addNotification('success', 'Network topology regenerated');
  }, [regenerateNetwork, addNotification]);

  const coverageColor =
    networkStats.coveragePercent >= 80
      ? 'text-green-400'
      : networkStats.coveragePercent >= 50
      ? 'text-orange-400'
      : 'text-red-400';

  const stats: StatCardProps[] = [
    {
      label: 'Total Nodes',
      value: networkStats.totalNodes,
      icon: Cpu,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/15',
    },
    {
      label: 'Connected',
      value: networkStats.connectedNodes,
      icon: Wifi,
      color: 'text-green-400',
      bg: 'bg-green-500/15',
    },
    {
      label: 'Reachable',
      value: networkStats.reachableNodes,
      sub: `${networkStats.coveragePercent.toFixed(0)}% coverage`,
      icon: Radio,
      color: coverageColor,
      bg: 'bg-blue-500/15',
    },
    {
      label: 'Disconnected',
      value: networkStats.disconnectedNodes,
      icon: WifiOff,
      color: 'text-red-400',
      bg: 'bg-red-500/15',
    },
    {
      label: 'Avg Hops',
      value: networkStats.averageHops.toFixed(1),
      icon: Activity,
      color: 'text-purple-400',
      bg: 'bg-purple-500/15',
    },
    {
      label: 'Msgs Relayed',
      value: networkStats.messagesRelayed,
      icon: BarChart2,
      color: 'text-blue-400',
      bg: 'bg-blue-500/15',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-950/80 backdrop-blur-md border-b border-white/5 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <NetworkIcon className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg font-bold text-gray-100">Network Topology</h1>
            {/* Live pulse */}
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/25 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Regenerate</span>
            </button>
            <button
              onClick={handleSimulateFailure}
              disabled={isSimulatingFailure}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-all disabled:opacity-50"
            >
              <AlertTriangle className={`w-4 h-4 ${isSimulatingFailure ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">Simulate Failure</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-5 space-y-5">

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* ── Network Graph (full size) ── */}
        <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-gray-200">Live Network Map</h2>
            <span className="text-xs text-gray-600 ml-auto">
              {networkStats.totalNodes} nodes · {Array.from(adjacency.values()).reduce((acc, v) => acc + v.length, 0) / 2} edges
            </span>
          </div>
          <div style={{ height: 480 }}>
            <NetworkGraph
              devices={peers}
              adjacencyList={adjacency}
              demoRoute={demoRoute}
              demoActiveHop={demoActiveHop}
            />
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="flex flex-wrap gap-4 px-1">
          {[
            { color: 'bg-cyan-400', label: 'Your device' },
            { color: 'bg-green-400', label: 'Connected peer' },
            { color: 'bg-gray-600', label: 'Offline / unreachable' },
            { color: 'bg-orange-400', label: 'Demo route active' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 text-xs text-gray-500">
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
              {label}
            </div>
          ))}
        </div>

        {/* ── Route Recovery Banner (shown after failure) ── */}
        {networkStats.disconnectedNodes > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
            <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-orange-300 text-sm font-semibold">Network Degraded</p>
              <p className="text-orange-400/70 text-xs mt-0.5">
                {networkStats.disconnectedNodes} node{networkStats.disconnectedNodes !== 1 ? 's' : ''} disconnected.
                The mesh will attempt to route messages via alternative paths.
                Use <strong>Regenerate</strong> to restore all nodes.
              </p>
            </div>
          </div>
        )}

        {/* ── Adjacency List ── */}
        <AdjacencyPanel adjacency={adjacency} />

        {/* ── Message stats ── */}
        <div className="bg-gray-900 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-gray-200">Message Statistics</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: 'Relayed', value: networkStats.messagesRelayed, color: 'text-blue-400' },
              { label: 'Delivered', value: networkStats.messagesDelivered, color: 'text-green-400' },
              {
                label: 'Duplicates',
                value: networkStats.duplicateMessages ?? 0,
                color: 'text-yellow-400',
              },
              {
                label: 'Coverage',
                value: `${networkStats.coveragePercent.toFixed(0)}%`,
                color: coverageColor,
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-800 rounded-xl p-3">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-gray-500 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Network;
