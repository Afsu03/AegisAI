/**
 * AegisAI Application-Level Secret Encryption Engine (Phase 5)
 * Secure AES-256-GCM authenticated encryption for BYOK API keys.
 */

import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

function getEncryptionKey(): Buffer {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET || 'aegis-ai-secure-encryption-key-secret-2026';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plaintext string (such as an API key) using AES-256-GCM.
 * Output format: `ivHex:authTagHex:encryptedHex`
 */
export function encryptApiKey(plaintext: string): string {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Invalid plaintext for encryption.');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted ciphertext string.
 * Verifies authenticity tag to prevent tampering.
 */
export function decryptApiKey(ciphertext: string): string {
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new Error('Invalid ciphertext for decryption.');
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Corrupted or invalid encrypted key format.');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Masks an API key for safe user-facing display.
 * Example: `TEST••••••••9X4K`
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || typeof apiKey !== 'string') return '••••••••';
  const clean = apiKey.trim();
  if (clean.length <= 8) {
    return '••••••••';
  }
  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-4);
  return `${prefix}••••••••${suffix}`;
}
