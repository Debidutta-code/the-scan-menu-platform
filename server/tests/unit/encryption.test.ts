import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt } from '../../src/utils/encryption';

describe('Encryption Utility', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should encrypt and decrypt successfully with a valid key', () => {
    process.env.ENCRYPTION_KEY = 'supersecretkeythishasto-be-32byte'; // 32 chars
    const plainText = 'my-secret-data-123';

    const encrypted = encrypt(plainText);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toEqual(plainText);
    expect(encrypted.split(':').length).toBe(3);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toEqual(plainText);
  });

  it('should hash a key that is not exactly 32 bytes and still work', () => {
    process.env.ENCRYPTION_KEY = 'short-key';
    const plainText = 'another-secret-data';

    const encrypted = encrypt(plainText);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toEqual(plainText);
  });

  it('should throw an error if ENCRYPTION_KEY is missing on encrypt', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
  });

  it('should throw an error if ENCRYPTION_KEY is missing on decrypt', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => decrypt('iv:tag:data')).toThrow('ENCRYPTION_KEY environment variable is not set');
  });

  it('should handle empty strings', () => {
    process.env.ENCRYPTION_KEY = 'supersecretkeythishasto-be-32byte';
    expect(encrypt('')).toBe('');
    expect(decrypt('')).toBe('');
  });

  it('should throw on invalid encrypted format', () => {
    process.env.ENCRYPTION_KEY = 'supersecretkeythishasto-be-32byte';
    expect(() => decrypt('invalidformat')).toThrow('Invalid encrypted data format');
  });
});
