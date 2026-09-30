/**
 * Device and message ID generation utilities
 */

const DEVICE_ID_KEY = 'meshlink_device_id';

/**
 * Generate a MeshLink device ID in the format ML-XXXXXX
 */
export function generateDeviceId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ML-';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MSG-${timestamp}-${random}`;
}

/**
 * Get or create a persistent device ID stored in localStorage
 */
export function getOrCreateDeviceId(): string {
  try {
    const stored = localStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const newId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch {
    return generateDeviceId();
  }
}

/**
 * Generate a short human-readable name for a simulated device
 */
const DEVICE_NAMES = [
  'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo',
  'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet',
  'Kilo', 'Lima', 'Mike', 'November', 'Oscar',
  'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango',
  'Uniform', 'Victor', 'Whiskey', 'Xray', 'Yankee', 'Zulu'
];

export function getSimulatedDeviceName(index: number): string {
  return DEVICE_NAMES[index % DEVICE_NAMES.length];
}

export function generateSimulatedDeviceId(index: number): string {
  return `SIM-${DEVICE_NAMES[index % DEVICE_NAMES.length].substring(0, 3).toUpperCase()}${index}`;
}

export function isValidDeviceId(id: string): boolean {
  return /^ML-[A-Z0-9]{6}$/.test(id);
}

