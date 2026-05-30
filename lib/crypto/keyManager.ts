/**
 * KeyManager — Manages E2EE keypairs with cloud-backed encrypted storage.
 *
 * Architecture:
 *   SOURCE OF TRUTH  → Supabase (encrypted_private_key, key_salt, key_iv)
 *   SESSION CACHE     → localStorage (decrypted key, for message en/decryption)
 *
 * Flow:
 *   Signup  → generate keypair → encrypt with password → upload to Supabase → cache locally
 *   Login   → fetch encrypted key → decrypt with password → cache locally
 *   Logout  → clear localStorage + sessionStorage
 */

import { SupabaseClient } from '@supabase/supabase-js';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { encryptPrivateKey, decryptPrivateKey, reEncryptWithCachedKey, clearCachedAesKey } from './keyVault';

const PRIVATE_KEY_STORAGE = 'twoofus_private_key';
const PUBLIC_KEY_STORAGE = 'twoofus_public_key';

// ── Key Generation ────────────────────────────────────────────────

/**
 * Generate a new NaCl keypair, encrypt the private key with the user's
 * password, and upload to Supabase. Cache the decrypted key locally.
 */
export async function generateAndUploadKeys(
  supabase: SupabaseClient,
  userId: string,
  password: string,
): Promise<string> {
  const keyPair = nacl.box.keyPair();
  const publicKeyB64 = encodeBase64(keyPair.publicKey);
  const secretKeyB64 = encodeBase64(keyPair.secretKey);

  // Encrypt private key with password (AES-GCM + PBKDF2)
  const { encryptedKey, salt, iv } = await encryptPrivateKey(secretKeyB64, password);

  // Upload encrypted key + public key to Supabase
  await supabase.from('profiles').upsert({
    id: userId,
    public_key: publicKeyB64,
    encrypted_private_key: encryptedKey,
    key_salt: salt,
    key_iv: iv,
  });

  // Cache decrypted keys in localStorage for the session
  localStorage.setItem(PRIVATE_KEY_STORAGE, secretKeyB64);
  localStorage.setItem(PUBLIC_KEY_STORAGE, publicKeyB64);

  return publicKeyB64;
}

/**
 * Fetch encrypted private key from Supabase, decrypt with password,
 * and cache locally. Called on login.
 */
export async function fetchAndDecryptKeys(
  supabase: SupabaseClient,
  userId: string,
  password: string,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('public_key, encrypted_private_key, key_salt, key_iv')
    .eq('id', userId)
    .single();

  if (!profile?.encrypted_private_key || !profile?.key_salt || !profile?.key_iv) {
    // No cloud backup exists (legacy account or first-time)
    return false;
  }

  try {
    const secretKeyB64 = await decryptPrivateKey(
      profile.encrypted_private_key,
      profile.key_salt,
      profile.key_iv,
      password,
    );

    localStorage.setItem(PRIVATE_KEY_STORAGE, secretKeyB64);
    localStorage.setItem(PUBLIC_KEY_STORAGE, profile.public_key || '');
    return true;
  } catch {
    // Wrong password or corrupted data
    return false;
  }
}

/**
 * Generate new keys for a new relationship, using the cached AES key
 * (so user doesn't re-enter password). Falls back to password prompt.
 */
export async function rotateKeysForNewRelationship(
  supabase: SupabaseClient,
  userId: string,
  password?: string,
): Promise<string | null> {
  const keyPair = nacl.box.keyPair();
  const publicKeyB64 = encodeBase64(keyPair.publicKey);
  const secretKeyB64 = encodeBase64(keyPair.secretKey);

  // Try cached AES key first, fall back to password
  let encrypted = await reEncryptWithCachedKey(secretKeyB64);
  if (!encrypted && password) {
    encrypted = await encryptPrivateKey(secretKeyB64, password);
  }
  if (!encrypted) return null;

  await supabase.from('profiles').update({
    public_key: publicKeyB64,
    encrypted_private_key: encrypted.encryptedKey,
    key_salt: encrypted.salt,
    key_iv: encrypted.iv,
  }).eq('id', userId);

  localStorage.setItem(PRIVATE_KEY_STORAGE, secretKeyB64);
  localStorage.setItem(PUBLIC_KEY_STORAGE, publicKeyB64);

  return publicKeyB64;
}

// ── Session Key Access ────────────────────────────────────────────

export function getMyKeys() {
  const secretKey = localStorage.getItem(PRIVATE_KEY_STORAGE);
  const publicKey = localStorage.getItem(PUBLIC_KEY_STORAGE);
  if (!secretKey || !publicKey) return null;
  return {
    secretKey: decodeBase64(secretKey),
    publicKey: decodeBase64(publicKey),
  };
}

export function getMyPublicKeyB64(): string | null {
  return localStorage.getItem(PUBLIC_KEY_STORAGE);
}

export function hasSessionKeys(): boolean {
  return !!localStorage.getItem(PRIVATE_KEY_STORAGE) && !!localStorage.getItem(PUBLIC_KEY_STORAGE);
}

// ── Key Export/Import (Manual Backup) ─────────────────────────────

export function exportPrivateKey(): string {
  return localStorage.getItem(PRIVATE_KEY_STORAGE) || '';
}

export function importPrivateKey(b64: string) {
  const keyPair = nacl.box.keyPair.fromSecretKey(decodeBase64(b64));
  localStorage.setItem(PRIVATE_KEY_STORAGE, b64);
  localStorage.setItem(PUBLIC_KEY_STORAGE, encodeBase64(keyPair.publicKey));
}

// ── Cleanup ───────────────────────────────────────────────────────

export function clearAllKeys(): void {
  localStorage.removeItem(PRIVATE_KEY_STORAGE);
  localStorage.removeItem(PUBLIC_KEY_STORAGE);
  clearCachedAesKey();
}
