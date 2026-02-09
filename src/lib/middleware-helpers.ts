import { verifyJWT } from '@/lib/jwt';
import { verifyCsrfToken, verifyOrigin } from '@/lib/csrf';

/**
 * Request headers interface for dependency injection
 */
export interface RequestHeaders {
  get(name: string): string | null;
}

/**
 * Request cookies interface for dependency injection
 */
export interface RequestCookies {
  get(name: string): { name: string; value: string } | undefined;
  getAll(): Array<{ name: string; value: string }>;
}

/**
 * Verification result types
 */
export type VerificationResult =
  | { success: true; payload?: any }
  | { success: false; error: string; status: number };

/**
 * Verify CSRF protection for state-changing operations
 * Returns verification result with error details if failed
 */
export async function verifyCsrfProtection(
  method: string,
  headers: RequestHeaders,
  cookies: RequestCookies
): Promise<VerificationResult> {
  // Only verify CSRF for state-changing operations
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return { success: true };
  }

  // Verify origin/referer
  const origin = headers.get('origin');
  const referer = headers.get('referer');
  const host = headers.get('host');

  if (!verifyOrigin(origin, referer, host)) {
    console.error('CSRF: Origin/Referer verification failed');
    console.error('Origin:', origin, 'Referer:', referer, 'Host:', host);
    return {
      success: false,
      error: 'Forbidden - Invalid request origin',
      status: 403,
    };
  }

  // Verify CSRF token (Double Submit Cookie pattern)
  const csrfCookie = cookies.get('csrf_token')?.value;
  const csrfHeader = headers.get('x-csrf-token') ?? undefined;

  if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
    console.error('CSRF: Token verification failed');
    console.error('Cookie present:', !!csrfCookie, 'Header present:', !!csrfHeader);
    return {
      success: false,
      error: 'Forbidden - Invalid CSRF token',
      status: 403,
    };
  }

  return { success: true };
}

/**
 * Verify JWT authentication token
 * Returns verification result with payload if successful
 */
export async function verifyAuthentication(
  cookies: RequestCookies
): Promise<VerificationResult> {
  const token = cookies.get('auth_token')?.value;

  console.log('Token present:', !!token);
  console.log('All cookies:', cookies.getAll());

  if (!token) {
    console.error('No token found in cookies');
    console.error('Available cookies:', cookies.getAll().map(c => c.name));
    return {
      success: false,
      error: 'Unauthorized - No token provided',
      status: 401,
    };
  }

  const payload = await verifyJWT(token);

  if (!payload) {
    return {
      success: false,
      error: 'Unauthorized - Invalid or expired token',
      status: 401,
    };
  }

  return { success: true, payload };
}

/**
 * Create user headers from JWT payload
 */
export function createUserHeaders(payload: any): Record<string, string> {
  return {
    'x-user-conference-id': payload.conferenceId,
    'x-user-staff-name': payload.staffName,
    'x-user-role': payload.role,
  };
}
