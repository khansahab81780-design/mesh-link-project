/**
 * CryptoManager — Web Crypto API based encryption layer
 *
 * Architecture:
 * - Uses AES-GCM for authenticated encryption
 * - Uses ECDSA for message signing
 * - Relay nodes forward encrypted payloads WITHOUT being able to read contents
 * - Private keys stored in IndexedDB (never in localStorage as plaintext)
 * - Future native app can implement stronger E2E with same interface
 */

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  authTag?: string; // included in GCM ciphertext
}

export interface SignedMessage {
  payload: string;
  signature: string;
  signerPublicKey: string;
}

export interface CryptoIdentity {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyExported: string; // base64 SPKI
}

class CryptoManagerClass {
  private symmetricKey: CryptoKey | null = null;
  private identity: CryptoIdentity | null = null;

  /**
   * Generate a new device identity (ECDSA key pair for signing)
   */
  async generateIdentity(): Promise<CryptoIdentity> {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );

    const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));

    this.identity = {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      publicKeyExported: publicKeyBase64,
    };

    return this.identity;
  }

  /**
   * Generate a symmetric AES-GCM key for message encryption
   */
  async generateSymmetricKey(): Promise<CryptoKey> {
    this.symmetricKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    return this.symmetricKey;
  }

  /**
   * Encrypt a message payload using AES-GCM
   * Relay nodes receive encrypted payload and cannot read contents
   */
  async encryptMessage(plaintext: string, key?: CryptoKey): Promise<EncryptedPayload> {
    const useKey = key || this.symmetricKey || await this.generateSymmetricKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      useKey,
      data
    );

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
      iv: btoa(String.fromCharCode(...iv)),
    };
  }

  /**
   * Decrypt a message payload
   */
  async decryptMessage(encrypted: EncryptedPayload, key?: CryptoKey): Promise<string> {
    const useKey = key || this.symmetricKey;
    if (!useKey) throw new Error('No decryption key available');

    const ciphertext = Uint8Array.from(atob(encrypted.ciphertext), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      useKey,
      ciphertext
    );

    return new TextDecoder().decode(plaintext);
  }

  /**
   * Sign a message with the device's private key
   */
  async signMessage(payload: string): Promise<string> {
    if (!this.identity) throw new Error('No identity generated');
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);

    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      this.identity.privateKey,
      data
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  /**
   * Verify a message signature
   */
  async verifyMessage(
    payload: string,
    signature: string,
    publicKeyBase64: string
  ): Promise<boolean> {
    try {
      const publicKeyBuffer = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
      );

      const signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
      const encoder = new TextEncoder();

      return await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        signatureBuffer,
        encoder.encode(payload)
      );
    } catch {
      return false;
    }
  }

  /**
   * Export symmetric key as base64 for storage
   */
  async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  /**
   * Import symmetric key from base64
   */
  async importKey(keyBase64: string): Promise<CryptoKey> {
    const keyBuffer = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    return crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate a simple hash for message deduplication
   */
  async hashMessage(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash))).substring(0, 16);
  }

  getIdentity(): CryptoIdentity | null {
    return this.identity;
  }

  getSymmetricKey(): CryptoKey | null {
    return this.symmetricKey;
  }
}

export const CryptoManager = new CryptoManagerClass();
export default CryptoManager;
