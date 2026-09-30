import { describe, it, expect } from 'vitest';
import {
  isMessageExpired,
  processMessageForRelay,
  calculateExpiresAt,
  formatRelativeTime,
} from '../utils/ttl';
import type { MeshMessage } from '../types/mesh';

function createTestMessage(ttl: number, expiresAt: number): MeshMessage {
  return {
    messageId: 'test-msg-123',
    senderId: 'dev-1',
    destinationId: 'dev-4',
    timestamp: Date.now() - 5000,
    ttl,
    hopCount: 1,
    payload: 'hello encrypted payload',
    route: ['dev-1', 'dev-2'],
    status: 'relayed',
    expiresAt,
    isBroadcast: false,
  };
}

describe('TTL & Store-and-Forward Logic', () => {
  it('correctly identifies expired messages by timestamp', () => {
    const past = Date.now() - 1000;
    const msg = createTestMessage(5, past);
    expect(isMessageExpired(msg)).toBe(true);
  });

  it('correctly identifies unexpired messages', () => {
    const future = Date.now() + 60_000;
    const msg = createTestMessage(5, future);
    expect(isMessageExpired(msg)).toBe(false);
  });

  it('decrements TTL and increments hopCount when relayed', () => {
    const future = Date.now() + 60_000;
    const msg = createTestMessage(5, future);

    const relayed = processMessageForRelay(msg, 'dev-3');
    expect(relayed).not.toBeNull();
    expect(relayed?.ttl).toBe(4);
    expect(relayed?.hopCount).toBe(2);
    expect(relayed?.route).toContain('dev-3');
  });

  it('drops message if TTL reaches zero', () => {
    const future = Date.now() + 60_000;
    const msg = createTestMessage(1, future);

    const relayed = processMessageForRelay(msg, 'dev-3');
    // TTL was 1, after relay it becomes 0, so message cannot be further relayed
    expect(relayed).toBeNull();
  });

  it('calculates expiration timestamp from minutes', () => {
    const before = Date.now();
    const expiresAt = calculateExpiresAt(10); // 10 minutes
    const after = Date.now();

    const tenMinutesMs = 10 * 60 * 1000;
    expect(expiresAt).toBeGreaterThanOrEqual(before + tenMinutesMs);
    expect(expiresAt).toBeLessThanOrEqual(after + tenMinutesMs);
  });

  it('formats relative time strings properly', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 10_000)).toBe('just now');
    expect(formatRelativeTime(now - 120_000)).toBe('2m ago');
    expect(formatRelativeTime(now - 7_200_000)).toBe('2h ago');
  });
});
