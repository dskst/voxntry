import { SignJWT, jwtVerify } from 'jose';

// Custom JWT Payload type for our application
export interface AuthPayload {
  conferenceId: string;
  staffName: string;
  role: 'staff' | 'admin';
}

// Get JWT secret as Uint8Array
const getJwtSecret = (): Uint8Array => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
};

/**
 * Sign a JWT token
 * @param payload - User information to encode
 * @returns Signed JWT token
 */
export async function signJWT(payload: AuthPayload): Promise<string> {
  const secret = getJwtSecret();

  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('24h') // Token expires in 24 hours
    .sign(secret);

  return token;
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export async function verifyJWT(token: string): Promise<AuthPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);

    // Validate payload structure
    if (
      typeof payload.conferenceId === 'string' &&
      typeof payload.staffName === 'string' &&
      (payload.role === 'staff' || payload.role === 'admin')
    ) {
      return {
        conferenceId: payload.conferenceId,
        staffName: payload.staffName,
        role: payload.role,
      };
    }

    return null;
  } catch (error) {
    // Token is invalid, expired, or malformed
    console.error('JWT verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}
