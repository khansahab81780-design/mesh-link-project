/**
 * Dashboard.tsx — MeshLink Main Dashboard
 *
 * Shows connection status, network graph, recent messages,
 * nearby peers, and quick-action controls.
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Send,
  UserPlus,
  AlertTriangle,
  MessageSquare,
  ChevronRight,
  Activity,
  Radio,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useMesh } from '../hooks/useMesh';
import { useMeshStore } from '../store/meshStore';
import { SimulationTransport } from '../services/mesh/SimulationTransport';
import ConnectionStatusBar from '../components/StatusIndicator';
import PeerList from '../components/PeerList';
import NetworkGraph from '../components/NetworkGraph';
import MessageBubble from '../components/MessageBubble';

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
}

function StatCard({ label, value, icon: Icon, color = 'text-cyan-400' }: StatCardProps) {
  return (
    <div className="flex-1 min-w-0 bg-gray-900 border border-white/10 rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-500 text-xs">{label}</span>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const {
    sendMessage,
    simulateNetworkFailure,
    runDemo,
    demoRunning,
    regenerateNetwork,
  } = useMesh();

  const {
    peers,
    messages,
    networkStats,
    identity,
    connectionStatus,
    internetStatus,
    demoRoute,
    demoActiveHop,
    addNotification,
  } = useMeshStore();

  const recentMessages = messages.slice(0, 5);
  const connectedPeers = peers.filter((p) => p.isConnected);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleBroadcast = useCallback(async () => {
    if (!identity) return;
    const text = `Broadcast from ${identity.displayName || identity.deviceId.slice(0, 6)} at ${new Date().toLocaleTimeString()}`;
    await sendMessage('broadcast', text, true);
  }, [identity, sendMessage]);

  const handleAddPeer = useCallback(() => {
    regenerateNetwork(
      SimulationTransport.getAllSimulatedDevices().length + 1
    );
    addNotification('success', 'New simulated peer added to network');
  }, [regenerateNetwork, addNotification]);

  const handleSimulateFailure = useCallback(() => {
    simulateNetworkFailure();
  }, [simulateNetworkFailure]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Connection status bar */}
      <ConnectionStatusBar />

      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between max-w-5xl mx-auto">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-500 text-xs mt-0.5">
            {identity?.displayName || identity?.deviceId?.slice(0, 12) || 'MeshLink Node'}
          </p>
        </div>

        {/* Demo button */}
        <button
          onClick={runDemo}
          disabled={demoRunning}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            demoRunning
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 cursor-not-allowed animate-pulse'
              : 'bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25'
          }`}
        >
          <Zap className="w-4 h-4" />
          {demoRunning ? 'Running Demo…' : 'Demo Mode'}
        </button>
      </div>

      <div className="px-4 max-w-5xl mx-auto space-y-4">

        {/* ── Stats row ── */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          <StatCard
            label="Nodes"
            value={networkStats.totalNodes}
            icon={Radio}
            color="text-cyan-400"
          />
          <StatCard
            label="Connected"
            value={networkStats.connectedNodes}
            icon={Wifi}
            color="text-green-400"
          />
          <StatCard
            label="Offline"
            value={networkStats.disconnectedNodes}
            icon={WifiOff}
            color="text-red-400"
          />
          <StatCard
            label="Delivered"
            value={networkStats.messagesDelivered}
            icon={Activity}
            color="text-blue-400"
          />
        </div>

        {/* ── Network Graph ── */}
        <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">Network Topology</h2>
            <button
              onClick={() => navigate('/network')}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View full
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div style={{ height: 350 }}>
            <NetworkGraph
              devices={peers}
              adjacencyList={SimulationTransport.getAdjacencyList()}
              demoRoute={demoRoute}
              demoActiveHop={demoActiveHop}
            />
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handleBroadcast}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 transition-all active:scale-95"
          >
            <Send className="w-5 h-5" />
            <span className="text-xs font-semibold">Send Broadcast</span>
          </button>
          <button
            onClick={handleAddPeer}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 text-green-400 transition-all active:scale-95"
          >
            <UserPlus className="w-5 h-5" />
            <span className="text-xs font-semibold">Add Peer</span>
          </button>
          <button
            onClick={handleSimulateFailure}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 transition-all active:scale-95"
          >
            <AlertTriangle className="w-5 h-5" />
            <span className="text-xs font-semibold">Simulate Failure</span>
          </button>
        </div>

        {/* ── Recent Messages ── */}
        <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-gray-200">Recent Messages</h2>
            </div>
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Open Chat
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {recentMessages.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-600 text-sm">
                No messages yet. Send a broadcast or open Chat.
              </div>
            ) : (
              recentMessages.map((msg) => (
                <div key={msg.messageId} className="px-4 py-2">
                  <MessageBubble
                    message={msg}
                    isSelf={msg.senderId === identity?.deviceId}
                    compact
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Nearby Peers ── */}
        <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">
              Nearby Peers
              <span className="ml-2 text-xs text-gray-500">({connectedPeers.length} connected)</span>
            </h2>
            <button
              onClick={() => navigate('/network')}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              All nodes
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <PeerList
            peers={connectedPeers.slice(0, 6)}
            onSelectPeer={(peerId: string) => {
              useMeshStore.getState().setActiveChatPeer(peerId);
              navigate('/chat');
            }}
            compact
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
