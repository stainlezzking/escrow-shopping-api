import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

/**
 * Hashes and verifies user passwords with Node.js scrypt.
 */
@Injectable()
export class PasswordHasherService {
  /**
   * Hashes a plaintext password for storage.
   *
   * @param password - User-provided plaintext password.
   * @returns Versioned scrypt hash containing salt and derived key.
   */
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

    return `scrypt$${salt}$${derivedKey.toString('hex')}`;
  }

  /**
   * Verifies a plaintext password against a stored scrypt hash.
   *
   * @param password - User-provided plaintext password.
   * @param storedHash - Versioned scrypt hash from storage.
   * @returns True when the password matches.
   */
  async verify(password: string, storedHash: string): Promise<boolean> {
    const [algorithm, salt, hash] = storedHash.split('$');

    if (algorithm !== 'scrypt' || !salt || !hash) {
      return false;
    }

    const expected = Buffer.from(hash, 'hex');
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;

    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}
