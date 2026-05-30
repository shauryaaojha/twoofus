import test from 'node:test';
import assert from 'node:assert';
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';
import { encryptMessage, decryptMessage } from './e2ee';

test('decryptMessage', async (t) => {
  const aliceKeypair = nacl.box.keyPair();
  const bobKeypair = nacl.box.keyPair();

  const message = 'Hello, world!';

  await t.test('successfully decrypts a valid message', () => {
    const { ciphertext, nonce } = encryptMessage(message, bobKeypair.publicKey, aliceKeypair.secretKey);
    const decrypted = decryptMessage(ciphertext, nonce, aliceKeypair.publicKey, bobKeypair.secretKey);
    assert.strictEqual(decrypted, message);
  });

  await t.test('returns null for invalid base64 ciphertext', () => {
    const { nonce } = encryptMessage(message, bobKeypair.publicKey, aliceKeypair.secretKey);
    const decrypted = decryptMessage('not_base_64!@#', nonce, aliceKeypair.publicKey, bobKeypair.secretKey);
    assert.strictEqual(decrypted, null);
  });

  await t.test('returns null for invalid base64 nonce', () => {
    const { ciphertext } = encryptMessage(message, bobKeypair.publicKey, aliceKeypair.secretKey);
    const decrypted = decryptMessage(ciphertext, 'not_base_64!@#', aliceKeypair.publicKey, bobKeypair.secretKey);
    assert.strictEqual(decrypted, null);
  });

  await t.test('returns null for incorrect public key', () => {
    const eveKeypair = nacl.box.keyPair();
    const { ciphertext, nonce } = encryptMessage(message, bobKeypair.publicKey, aliceKeypair.secretKey);
    const decrypted = decryptMessage(ciphertext, nonce, eveKeypair.publicKey, bobKeypair.secretKey);
    assert.strictEqual(decrypted, null);
  });

  await t.test('returns null for incorrect secret key', () => {
    const eveKeypair = nacl.box.keyPair();
    const { ciphertext, nonce } = encryptMessage(message, bobKeypair.publicKey, aliceKeypair.secretKey);
    const decrypted = decryptMessage(ciphertext, nonce, aliceKeypair.publicKey, eveKeypair.secretKey);
    assert.strictEqual(decrypted, null);
  });

  await t.test('returns null if ciphertext is modified', () => {
    const { nonce } = encryptMessage(message, bobKeypair.publicKey, aliceKeypair.secretKey);
    const modifiedCiphertext = encodeBase64(nacl.randomBytes(40));
    const decrypted = decryptMessage(modifiedCiphertext, nonce, aliceKeypair.publicKey, bobKeypair.secretKey);
    assert.strictEqual(decrypted, null);
  });
});
