import { randomBytes, timingSafeEqual } from 'crypto';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Verify CSRF token using timing-safe comparison
 * Implements Double Submit Cookie pattern
 */
export function verifyCsrfToken(
  cookieToken: string | undefined,
  headerToken: string | undefined
): boolean {
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Ensure both tokens are the same length before comparison
  if (cookieToken.length !== headerToken.length) {
    return false;
  }

  try {
    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    );
  } catch {
    return false;
  }
}

/**
 * Verify request origin to prevent CSRF attacks
 * Checks Origin and Referer headers
 */
export function verifyOrigin(
  origin: string | null,
  referer: string | null,
  host: string | null
): boolean {
  if (!host) return false;

  const allowedOrigins = [
    `https://${host}`,
    // Allow localhost in development
    process.env.NODE_ENV === 'development' ? `http://${host}` : null,
    process.env.NODE_ENV === 'development' ? `http://localhost:3000` : null,
  ].filter(Boolean) as string[];

  // Check Origin header (preferred)
  if (origin && allowedOrigins.includes(origin)) {
    return true;
  }

  // Fallback to Referer header
  if (referer && allowedOrigins.some(allowed => referer.startsWith(allowed))) {
    return true;
  }

  return false;
}
