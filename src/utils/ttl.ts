import type { MeshMessage, MessageStatus } from '../types/mesh';

/**
 * TTL and message expiration utilities
 */

/**
 * Check if a message has expired based on TTL and timestamp
 */
export function isMessageExpired(message: MeshMessage): boolean {
  const now = Date.now();
  if (message.ttl <= 0) return true;
  if (message.expiresAt && now > message.expiresAt) return true;
  return false;
}

/**
 * Decrement TTL and increment hop count for relay
 * Returns null if message should be discarded
 */
export function processMessageForRelay(
  message: MeshMessage,
  relayerId: string
): MeshMessage | null {
  if (isMessageExpired(message)) return null;
  if (message.ttl <= 1) return null;

  return {
    ...message,
    ttl: message.ttl - 1,
    hopCount: message.hopCount + 1,
    route: [...message.route, relayerId],
    status: 'relayed' as MessageStatus,
  };
}

/**
 * Calculate expiration timestamp from minutes
 */
export function calculateExpiresAt(expirationMinutes: number): number {
  return Date.now() + expirationMinutes * 60 * 1000;
}

/**
 * Format time remaining until expiration
 */
export function formatTimeRemaining(expiresAt: number): string {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return 'Expired';
  const minutes = Math.floor(remaining / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}
