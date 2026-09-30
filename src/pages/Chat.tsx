/**
 * Chat.tsx — MeshLink Chat Page
 *
 * Split-pane chat UI: left peer list, right message thread.
 * Supports unicast and broadcast messaging with TTL selector,
 * route visualization, and full mobile responsiveness.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Radio,
  ArrowLeft,
  Hash,
  Clock,
  Route,
  AlertCircle,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import { useMesh } from '../hooks/useMesh';
import { useMeshStore } from '../store/meshStore';
import MessageBubble from '../components/MessageBubble';
import PeerList from '../components/PeerList';
import type { TTLSetting, Peer } from '../types/mesh';

// ── TTL selector ──────────────────────────────────────────────────────────────

const TTL_OPTIONS: TTLSetting[] = [5, 10, 20, 50];

function TTLSelector({
  value,
  onChange,
}: {
  value: TTLSetting;
  onChange: (v: TTLSetting) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-800 border border-white/10 text-gray-400 text-xs font-mono hover:text-gray-200 transition-colors"
        title="Set TTL"
      >
        <Hash className="w-3 h-3" />
        TTL:{value}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 bg-gray-800 border border-white/10 rounded-xl shadow-xl z-30 overflow-hidden">
          {TTL_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full px-4 py-2 text-sm text-left transition-colors ${
                opt === value
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              TTL {opt} hops
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-white/10 flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-gray-600" />
      </div>
      <h3 className="text-gray-300 font-semibold mb-2">Select a peer to start messaging</h3>
      <p className="text-gray-600 text-sm max-w-xs leading-relaxed">
        Choose a peer from the list on the left to open a conversation, or send a
        broadcast to reach all reachable nodes.
      </p>
    </div>
  );
}

// ── Route badge ───────────────────────────────────────────────────────────────

function RouteBadge({ route }: { route: string[] }) {
  if (!route || route.length <= 1) return null;
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-500 max-w-full overflow-hidden">
      <Route className="w-3 h-3 text-cyan-500/60 shrink-0" />
      <span className="truncate font-mono">{route.map(id => id.slice(0, 6)).join(' → ')}</span>
    </div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  peer: Peer | null;
  isBroadcast: boolean;
  onBack: () => void;
}

function ChatPanel({ peer, isBroadcast, onBack }: ChatPanelProps) {
  const { sendMessage } = useMesh();
  const { identity, messages, settings, updateSettings } = useMeshStore();
  const [text, setText] = useState('');
  const [ttl, setTtl] = useState<TTLSetting>(settings.defaultTTL);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter messages for this conversation
  const conversationMessages = messages.filter((m) => {
    if (isBroadcast) return m.isBroadcast;
    if (!peer) return false;
    return (
      (m.senderId === identity?.deviceId && m.destinationId === peer.id) ||
      (m.senderId === peer.id && m.destinationId === identity?.deviceId)
    );
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationMessages.length]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const dest = isBroadcast ? 'broadcast' : peer?.id ?? 'broadcast';
      await sendMessage(dest, trimmed, isBroadcast);
      setText('');
    } finally {
      setSending(false);
    }
  }, [text, sending, isBroadcast, peer, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const headerTitle = isBroadcast ? 'Broadcast' : peer?.displayName ?? 'Unknown';
  const headerSub = isBroadcast
    ? 'Message to all reachable nodes'
    : peer
    ? `${peer.hopsAway > 0 ? `${peer.hopsAway} hop${peer.hopsAway > 1 ? 's' : ''} away` : 'Direct'} · ${peer.isConnected ? 'Connected' : 'Offline'}`
    : '';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
        <button
          onClick={onBack}
          className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isBroadcast ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'
          }`}
        >
          {isBroadcast ? <Radio className="w-4 h-4" /> : (peer?.displayName?.[0] ?? '?').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-100 font-semibold text-sm truncate">{headerTitle}</p>
          {headerSub && <p className="text-gray-500 text-xs truncate">{headerSub}</p>}
        </div>
        {peer && !isBroadcast && (
          <div
            className={`w-2 h-2 rounded-full ${peer.isConnected ? 'bg-green-400' : 'bg-gray-600'}`}
          />
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {conversationMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 text-sm">
            <AlertCircle className="w-8 h-8 mb-2 text-gray-700" />
            No messages yet. Say hello!
          </div>
        ) : (
          conversationMessages.map((msg) => (
            <div key={msg.messageId} className="space-y-1">
              <MessageBubble
                message={msg}
                isSelf={msg.senderId === identity?.deviceId}
              />
              {msg.route && msg.route.length > 1 && (
                <div className={`flex ${msg.senderId === identity?.deviceId ? 'justify-end' : 'justify-start'}`}>
                  <RouteBadge route={msg.route} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-white/10 bg-gray-950 px-4 py-3">
        {/* Controls row */}
        <div className="flex items-center gap-2 mb-2">
          <TTLSelector value={ttl} onChange={setTtl} />
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Clock className="w-3 h-3" />
            {settings.defaultExpiration >= 60
              ? `${settings.defaultExpiration / 60}h`
              : `${settings.defaultExpiration}m`}
          </div>
          {isBroadcast && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs">
              <Radio className="w-3 h-3" />
              Broadcast
            </span>
          )}
        </div>

        {/* Text input + send */}
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isBroadcast
                ? 'Type a broadcast message… (Enter to send)'
                : `Message ${peer?.displayName ?? ''}…`
            }
            rows={1}
            className="flex-1 bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:border-cyan-500/50 transition-colors max-h-32 min-h-[40px]"
            style={{ lineHeight: '1.4' }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shrink-0 self-end"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const Chat: React.FC = () => {
  const { peers, activeChatPeerId, setActiveChatPeer } = useMeshStore();
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const selectedPeer = peers.find((p) => p.id === activeChatPeerId) ?? null;

  const handleSelectPeer = (peerId: string) => {
    setActiveChatPeer(peerId);
    setIsBroadcast(false);
    setMobileView('chat');
  };

  const handleBroadcastSelect = () => {
    setActiveChatPeer(null);
    setIsBroadcast(true);
    setMobileView('chat');
  };

  const handleBack = () => {
    setMobileView('list');
  };

  const showChat = isBroadcast || selectedPeer !== null;

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Top bar (mobile) */}
      <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gray-950">
        <h1 className="text-lg font-bold text-gray-100">Chat</h1>
        {mobileView === 'list' && (
          <button
            onClick={handleBroadcastSelect}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-semibold"
          >
            <Radio className="w-3.5 h-3.5" />
            Broadcast
          </button>
        )}
      </div>

      {/* Split pane layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Peer List (hidden on mobile when chatting) ── */}
        <div
          className={`${
            mobileView === 'chat' ? 'hidden' : 'flex'
          } lg:flex flex-col w-full lg:w-72 xl:w-80 border-r border-white/10 bg-gray-950 shrink-0`}
        >
          {/* Broadcast option */}
          <button
            onClick={handleBroadcastSelect}
            className={`flex items-center gap-3 px-4 py-3 border-b border-white/10 transition-colors ${
              isBroadcast
                ? 'bg-orange-500/10 border-l-2 border-l-orange-500'
                : 'hover:bg-white/5'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Radio className="w-4.5 h-4.5 text-orange-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-100">Broadcast</p>
              <p className="text-xs text-gray-500">All reachable nodes</p>
            </div>
          </button>

          {/* Peer list */}
          <div className="flex-1 overflow-y-auto">
            <PeerList
              peers={peers}
              activePeerId={activeChatPeerId}
              onSelectPeer={handleSelectPeer}
              showMessages
            />
          </div>
        </div>

        {/* ── Right: Chat Panel ── */}
        <div
          className={`${
            mobileView === 'list' ? 'hidden' : 'flex'
          } lg:flex flex-1 flex-col min-w-0`}
        >
          {showChat ? (
            <ChatPanel
              peer={selectedPeer}
              isBroadcast={isBroadcast}
              onBack={handleBack}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
