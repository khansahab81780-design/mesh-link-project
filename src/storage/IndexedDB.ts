/**
 * IndexedDB storage layer for MeshLink
 * Handles offline-first message persistence
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { MeshMessage, Peer, UserIdentity } from '../types/mesh';

const DB_NAME = 'meshlink-db';
const DB_VERSION = 1;

interface MeshLinkDB {
  messages: MeshMessage;
  peers: Peer;
  identity: UserIdentity;
  processedIds: { id: string; timestamp: number };
  settings: { key: string; value: unknown };
}

let db: IDBPDatabase<MeshLinkDB> | null = null;

async function getDB(): Promise<IDBPDatabase<MeshLinkDB>> {
  if (db) return db;

  db = await openDB<MeshLinkDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Messages store
      if (!database.objectStoreNames.contains('messages')) {
        const messageStore = database.createObjectStore('messages', {
          keyPath: 'messageId',
        });
        messageStore.createIndex('by-timestamp', 'timestamp');
        messageStore.createIndex('by-sender', 'senderId');
        messageStore.createIndex('by-destination', 'destinationId');
        messageStore.createIndex('by-status', 'status');
      }

      // Peers store
      if (!database.objectStoreNames.contains('peers')) {
        const peerStore = database.createObjectStore('peers', {
          keyPath: 'id',
        });
        peerStore.createIndex('by-lastSeen', 'lastSeen');
      }

      // Identity store
      if (!database.objectStoreNames.contains('identity')) {
        database.createObjectStore('identity', { keyPath: 'deviceId' });
      }

      // Processed message IDs (dedup cache)
      if (!database.objectStoreNames.contains('processedIds')) {
        const processedStore = database.createObjectStore('processedIds', {
          keyPath: 'id',
        });
        processedStore.createIndex('by-timestamp', 'timestamp');
      }

      // Settings store
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });

  return db;
}

// ============================================================
// Messages
// ============================================================

export async function saveMessage(message: MeshMessage): Promise<void> {
  const database = await getDB();
  await database.put('messages', message);
}

export async function getMessage(messageId: string): Promise<MeshMessage | undefined> {
  const database = await getDB();
  return database.get('messages', messageId);
}

export async function getAllMessages(): Promise<MeshMessage[]> {
  const database = await getDB();
  const tx = database.transaction('messages', 'readonly');
  const index = tx.store.index('by-timestamp');
  const messages = await index.getAll();
  return messages.reverse(); // newest first
}

export async function getMessagesByPeer(peerId: string): Promise<MeshMessage[]> {
  const database = await getDB();
  const allMessages = await database.getAll('messages');
  return allMessages.filter(
    m => m.senderId === peerId || m.destinationId === peerId
  ).sort((a, b) => a.timestamp - b.timestamp);
}

export async function deleteExpiredMessages(): Promise<number> {
  const database = await getDB();
  const now = Date.now();
  const allMessages = await database.getAll('messages');
  let count = 0;
  for (const msg of allMessages) {
    if (msg.expiresAt && msg.expiresAt < now) {
      await database.delete('messages', msg.messageId);
      count++;
    }
  }
  return count;
}

// ============================================================
// Peers
// ============================================================

export async function savePeer(peer: Peer): Promise<void> {
  const database = await getDB();
  await database.put('peers', peer);
}

export async function getAllPeers(): Promise<Peer[]> {
  const database = await getDB();
  return database.getAll('peers');
}

export async function deletePeer(peerId: string): Promise<void> {
  const database = await getDB();
  await database.delete('peers', peerId);
}

// ============================================================
// Identity
// ============================================================

export async function saveIdentity(identity: UserIdentity): Promise<void> {
  const database = await getDB();
  await database.put('identity', identity);
}

export async function getIdentity(): Promise<UserIdentity | undefined> {
  const database = await getDB();
  const all = await database.getAll('identity');
  return all[0];
}

// ============================================================
// Processed Message IDs (Deduplication)
// ============================================================

export async function markMessageProcessed(messageId: string): Promise<void> {
  const database = await getDB();
  await database.put('processedIds', { id: messageId, timestamp: Date.now() });
}

export async function isMessageProcessed(messageId: string): Promise<boolean> {
  const database = await getDB();
  const result = await database.get('processedIds', messageId);
  return result !== undefined;
}

export async function cleanupProcessedIds(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
  const database = await getDB();
  const cutoff = Date.now() - maxAgeMs;
  const all = await database.getAll('processedIds');
  for (const entry of all) {
    if (entry.timestamp < cutoff) {
      await database.delete('processedIds', entry.id);
    }
  }
}

// ============================================================
// Settings
// ============================================================

export async function saveSetting(key: string, value: unknown): Promise<void> {
  const database = await getDB();
  await database.put('settings', { key, value });
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const database = await getDB();
    const result = await database.get('settings', key);
    return result ? (result.value as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}
