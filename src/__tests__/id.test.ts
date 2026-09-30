import { describe, it, expect } from 'vitest';
import { generateDeviceId, generateMessageId, isValidDeviceId } from '../utils/id';

describe('Device and Message ID Generation', () => {
  it('generates device IDs in ML-XXXXXX format', () => {
    const id = generateDeviceId();
    expect(id).toMatch(/^ML-[A-Z0-9]{6}$/);
    expect(isValidDeviceId(id)).toBe(true);
  });

  it('generates distinct IDs on consecutive calls', () => {
    const id1 = generateDeviceId();
    const id2 = generateDeviceId();
    expect(id1).not.toBe(id2);
  });

  it('generates valid message IDs', () => {
    const msgId1 = generateMessageId();
    const msgId2 = generateMessageId();
    expect(msgId1).toBeTruthy();
    expect(msgId1).not.toBe(msgId2);
  });

  it('validates invalid device ID strings', () => {
    expect(isValidDeviceId('INVALID')).toBe(false);
    expect(isValidDeviceId('ml-123456')).toBe(false); // lower-case
    expect(isValidDeviceId('ML-12345')).toBe(false); // too short
    expect(isValidDeviceId('')).toBe(false);
  });
});
