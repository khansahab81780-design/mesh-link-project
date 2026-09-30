import React from 'react';
import {
  CheckCheck,
  Check,
  Clock,
  AlertCircle,
  Share2,
  ChevronDown,
  ChevronUp,
  Radio,
  Hash,
  ArrowRight,
  RotateCcw,
  Timer,
} from 'lucide-react';
import type { MeshMessage, MessageStatus } from '../types/mesh';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: number): string {
  const delta = Date.now() - timestamp;
  if (delta < 60_000) return 'just now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function formatTTL(ttl: number): string {
  if (ttl <= 0) return 'expired';
  return `TTL ${ttl}`;
}

function formatMsgId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

// ─────────────────────────────────────────────────────────────
// Status icon
// ─────────────────────────────────────────────────────────────

interface StatusIconProps {
  status: MessageStatus;
  isOwn: boolean;
}

function StatusIcon({ status, isOwn }: StatusIconProps) {
  if (!isOwn) return null;

  switch (status) {
    case 'pending':
    case 'sending':
      return <Clock size={12} className="text-gray-400 animate-pulse" />;
    case 'sent':
      return <Check size={12} className="text-gray-400" />;
    case 'relayed':
      return <Share2 size={12} className="text-cyan-400" />;
    case 'delivered':
      return <CheckCheck size={12} className="text-green-400" />;
    case 'failed':
      return <AlertCircle size={12} className="text-red-400" />;
    case 'expired':
      return <Timer size={12} className="text-orange-400" />;
    case 'duplicate':
      return <RotateCcw size={12} className="text-gray-500" />;
    default:
      return null;
  }
}

function statusLabel(status: MessageStatus): string {
  const map: Record<MessageStatus, string> = {
    pending: 'Pending',
    sending: 'Sending…',
    sent: 'Sent',
    relayed: 'Relayed',
    delivered: 'Delivered',
    failed: 'Failed',
    expired: 'Expired',
    duplicate: 'Duplicate',
  };
  return map[status] ?? status;
}

// ─────────────────────────────────────────────────────────────
// Route display
// ─────────────────────────────────────────────────────────────

interface RouteDisplayProps {
  route: string[];
  activeHop?: number;
}

function RouteDisplay({ route, activeHop }: RouteDisplayProps) {
  if (route.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {route.map((nodeId, i) => {
        const isActive = activeHop !== undefined && i === activeHop;
        const isLast = i === route.length - 1;

        return (
          <React.Fragment key={`${nodeId}-${i}`}>
            <span
              className={[
                'px-1.5 py-0.5 rounded text-xs font-mono',
                isActive
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                  : 'bg-gray-800 text-gray-400 border border-white/10',
              ].join(' ')}
              title={nodeId}
            >
              {nodeId.slice(0, 6)}
            </span>
            {!isLast && (
              <ArrowRight size={10} className="text-gray-600 flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hop count badge
// ─────────────────────────────────────────────────────────────

function HopBadge({ hopCount }: { hopCount: number }) {
  const color =
    hopCount === 1
      ? 'bg-green-500/10 text-green-400 border-green-500/20'
      : hopCount <= 3
      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      : 'bg-orange-500/10 text-orange-400 border-orange-500/20';

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs ${color}`}>
      <Share2 size={10} />
      {hopCount === 1 ? 'direct' : `${hopCount} hops`}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// MessageBubble
// ─────────────────────────────────────────────────────────────

export interface MessageBubbleProps {
  message: MeshMessage;
  isOwn?: boolean;
  isSelf?: boolean;
  compact?: boolean;
}

export function MessageBubble({ message, isOwn: propIsOwn, isSelf, compact = false }: MessageBubbleProps) {
  const isOwn = propIsOwn ?? isSelf ?? false;
  const [routeExpanded, setRouteExpanded] = React.useState(false);
  const hasRoute = !compact && message.route && message.route.length > 1;

  const displayText = message.displayText ?? message.payload;
  const senderName = message.senderDisplayName ?? message.senderId.slice(0, 8);

  const bubbleBase = [
    'relative max-w-xs sm:max-w-sm rounded-2xl px-4 py-3',
    'border text-sm leading-relaxed',
    'shadow-sm',
  ];

  const ownBubble = [
    ...bubbleBase,
    'bg-cyan-900/40 border-cyan-700/50 text-gray-100',
    'rounded-br-sm',
  ].join(' ');

  const otherBubble = [
    ...bubbleBase,
    'bg-gray-800 border-gray-700 text-gray-100',
    'rounded-bl-sm',
  ].join(' ');

  return (
    <div
      className={[
        'flex flex-col gap-0.5',
        isOwn ? 'items-end' : 'items-start',
      ].join(' ')}
    >
      {/* Sender name (only for incoming) */}
      {!isOwn && (
        <span className="text-xs text-gray-400 px-1 font-medium">{senderName}</span>
      )}

      {/* Bubble */}
      <div className={isOwn ? ownBubble : otherBubble}>
        {/* Broadcast badge */}
        {message.isBroadcast && (
          <div className="flex items-center gap-1 mb-2 -mx-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/15 text-purple-400 border border-purple-500/20">
              <Radio size={10} />
              Broadcast
            </span>
          </div>
        )}

        {/* Message text */}
        <p className="break-words whitespace-pre-wrap">{displayText}</p>

        {/* Meta row */}
        <div
          className={[
            'flex items-center gap-2 mt-2 pt-2 border-t',
            isOwn ? 'border-cyan-700/30' : 'border-gray-700',
            'flex-wrap',
          ].join(' ')}
        >
          {/* Hop badge */}
          <HopBadge hopCount={message.hopCount} />

          {/* TTL */}
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Timer size={10} />
            {formatTTL(message.ttl)}
          </span>

          {/* Message ID */}
          <span
            className="flex items-center gap-1 text-xs text-gray-600 font-mono"
            title={message.messageId}
          >
            <Hash size={10} />
            {formatMsgId(message.messageId)}
          </span>

          {/* Spacer */}
          <span className="flex-1" />

          {/* Timestamp + status */}
          <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
            <span>{formatRelativeTime(message.timestamp)}</span>
            {isOwn && (
              <>
                <span className="text-gray-600">·</span>
                <span
                  className={[
                    'flex items-center gap-1',
                    message.status === 'failed' || message.status === 'expired'
                      ? 'text-red-400'
                      : message.status === 'delivered'
                      ? 'text-green-400'
                      : message.status === 'relayed'
                      ? 'text-cyan-400'
                      : 'text-gray-400',
                  ].join(' ')}
                >
                  <StatusIcon status={message.status} isOwn={isOwn} />
                  {statusLabel(message.status)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Route (collapsible) */}
        {hasRoute && (
          <div className="mt-2">
            <button
              onClick={() => setRouteExpanded((e) => !e)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ArrowRight size={10} />
              Route
              {routeExpanded ? (
                <ChevronUp size={10} />
              ) : (
                <ChevronDown size={10} />
              )}
            </button>

            {routeExpanded && (
              <RouteDisplay route={message.route} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
