/**
 * JWT Test Utilities
 *
 * Workaround for jose/vitest TextEncoder compatibility issue.
 * Uses Node.js crypto directly for test token generation.
 */

import { SignJWT } from 'jose';
import { TextEncoder as NodeTextEncoder } from 'util';

/**
 * Generate JWT secret as Uint8Array using Node's TextEncoder
 * This avoids the jsdom TextEncoder incompatibility with jose
 */
export function getTestJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not set in test environment');
  }
  // Use Node's TextEncoder explicitly
  return new NodeTextEncoder().encode(secret);
}

/**
 * Sign a test JWT token using Node's TextEncoder
 * This is a test-only version of signJWT that works around jsdom issues
 */
export async function signTestJWT(payload: Record<string, unknown>): Promise<string> {
  const secret = getTestJwtSecret();

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  return token;
}
