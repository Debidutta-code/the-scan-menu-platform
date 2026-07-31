import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;

/**
 * Gets the encryption key from environment variables.
 * Ensures the key is exactly 32 bytes for AES-256.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Required for encrypting sensitive data.');
  }

  if (Buffer.byteLength(key, 'utf8') !== KEY_LENGTH) {
    return crypto.createHash('sha256').update(key).digest();
  }

  return Buffer.from(key, 'utf8');
}

export function encrypt(text: string): string {
  if (!text) return text;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  if (!encryptedData) return encryptedData;

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected iv:authTag:ciphertext');
  }

  const key = getEncryptionKey();
  const [ivBase64, authTagBase64, ciphertextBase64] = parts;

  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextBase64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
