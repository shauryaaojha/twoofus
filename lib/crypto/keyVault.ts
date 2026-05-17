/**
 * KeyVault — Password-derived encryption for E2EE private keys.
 *
 * Uses Web Crypto API:
 *   PBKDF2 (600k iterations, SHA-256) → AES-GCM-256
 *
 * The server NEVER sees a plaintext private key.
 */

function bufferToBase64(buf: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buf.byteLength; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
}

function base64ToBuffer(b64: string): Uint8Array {
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf;
}

const PBKDF2_ITERATIONS = 600_000;
const SESSION_AES_KEY = 'twoofus_aes_key';

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,          // extractable so we can cache raw bytes
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt a base64-encoded NaCl private key with the user's password.
 * Returns base64 strings suitable for Supabase storage.
 */
export async function encryptPrivateKey(
  privateKeyB64: string,
  password: string,
): Promise<{ encryptedKey: string; salt: string; iv: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveAesKey(password, salt);

  // Cache derived key for in-session re-encryption (new relationship)
  await cacheAesKey(aesKey);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(privateKeyB64),
  );

  return {
    encryptedKey: bufferToBase64(new Uint8Array(ciphertext)),
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypt an encrypted private key using the user's password.
 * Returns the original base64-encoded NaCl private key.
 */
export async function decryptPrivateKey(
  encryptedKeyB64: string,
  saltB64: string,
  ivB64: string,
  password: string,
): Promise<string> {
  const salt = base64ToBuffer(saltB64);
  const iv = base64ToBuffer(ivB64);
  const encrypted = base64ToBuffer(encryptedKeyB64);
  const aesKey = await deriveAesKey(password, salt);

  // Cache derived key
  await cacheAesKey(aesKey);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    aesKey,
    encrypted.buffer as ArrayBuffer,
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Re-encrypt a private key using the cached AES key (for key rotation
 * when starting a new relationship without re-entering password).
 */
export async function reEncryptWithCachedKey(
  privateKeyB64: string,
): Promise<{ encryptedKey: string; salt: string; iv: string } | null> {
  const aesKey = await getCachedAesKey();
  if (!aesKey) return null;

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(privateKeyB64),
  );

  return {
    encryptedKey: bufferToBase64(new Uint8Array(ciphertext)),
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
  };
}

// ── Session AES key cache (sessionStorage) ────────────────────────

async function cacheAesKey(key: CryptoKey): Promise<void> {
  try {
    const raw = await crypto.subtle.exportKey('raw', key);
    sessionStorage.setItem(SESSION_AES_KEY, bufferToBase64(new Uint8Array(raw)));
  } catch { /* non-critical */ }
}

async function getCachedAesKey(): Promise<CryptoKey | null> {
  try {
    const b64 = sessionStorage.getItem(SESSION_AES_KEY);
    if (!b64) return null;
    const raw = base64ToBuffer(b64);
    return crypto.subtle.importKey('raw', raw.buffer as ArrayBuffer, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  } catch {
    return null;
  }
}

export function clearCachedAesKey(): void {
  try { sessionStorage.removeItem(SESSION_AES_KEY); } catch { /* */ }
}

export function hasCachedAesKey(): boolean {
  try { return !!sessionStorage.getItem(SESSION_AES_KEY); } catch { return false; }
}
