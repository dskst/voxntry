import { SignJWT } from 'jose';

/**
 * Helper to generate test JWT tokens
 */
export async function generateTestToken(
  payload: Record<string, unknown> = { username: 'admin' },
  secret: string = process.env.JWT_SECRET || 'test-jwt-secret-key-min-32-chars-long',
  expiresIn: string = '1h'
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

/**
 * Helper to generate expired test JWT tokens
 */
export async function generateExpiredTestToken(
  payload: Record<string, unknown> = { username: 'admin' },
  secret: string = process.env.JWT_SECRET || 'test-jwt-secret-key-min-32-chars-long'
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 7200) // 2 hours ago
    .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // 1 hour ago
    .sign(secretKey);
}
