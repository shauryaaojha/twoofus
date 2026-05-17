import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encryptMessage(
  plaintext: string,
  theirPublicKey: Uint8Array,
  mySecretKey: Uint8Array
): { ciphertext: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = encoder.encode(plaintext);
  const encrypted = nacl.box(messageUint8, nonce, theirPublicKey, mySecretKey);
  if (!encrypted) throw new Error('Encryption failed');
  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  };
}

export function decryptMessage(
  ciphertextB64: string,
  nonceB64: string,
  theirPublicKey: Uint8Array,
  mySecretKey: Uint8Array
): string | null {
  try {
    const ciphertext = decodeBase64(ciphertextB64);
    const nonce = decodeBase64(nonceB64);
    const decrypted = nacl.box.open(ciphertext, nonce, theirPublicKey, mySecretKey);
    if (!decrypted) return null;
    return decoder.decode(decrypted);
  } catch {
    return null;
  }
}

export function encryptFile(
  fileBytes: Uint8Array
): { encrypted: Uint8Array; key: Uint8Array; nonce: Uint8Array } {
  const key = nacl.randomBytes(nacl.secretbox.keyLength);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const encrypted = nacl.secretbox(fileBytes, nonce, key);
  if (!encrypted) throw new Error('File encryption failed');
  return { encrypted, key, nonce };
}

export function decryptFile(
  encrypted: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array
): Uint8Array | null {
  return nacl.secretbox.open(encrypted, nonce, key);
}

export function encryptSymmetricKey(
  symKey: Uint8Array,
  theirPublicKey: Uint8Array,
  mySecretKey: Uint8Array
): { encryptedKey: string; keyNonce: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encrypted = nacl.box(symKey, nonce, theirPublicKey, mySecretKey);
  if (!encrypted) throw new Error('Key encryption failed');
  return {
    encryptedKey: encodeBase64(encrypted),
    keyNonce: encodeBase64(nonce),
  };
}

export function decryptSymmetricKey(
  encryptedKeyB64: string,
  keyNonceB64: string,
  theirPublicKey: Uint8Array,
  mySecretKey: Uint8Array
): Uint8Array | null {
  try {
    const encrypted = decodeBase64(encryptedKeyB64);
    const nonce = decodeBase64(keyNonceB64);
    return nacl.box.open(encrypted, nonce, theirPublicKey, mySecretKey);
  } catch {
    return null;
  }
}
