import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { verifyCsrfToken, verifyOrigin } from '@/lib/csrf';

// Force Node.js runtime for crypto module support
export const runtime = 'nodejs';

/**
 * Middleware to verify JWT tokens and CSRF tokens for protected API routes
 */
export async function middleware(request: NextRequest) {
  console.log('=== Middleware called for:', request.nextUrl.pathname);
  console.log('NODE_ENV:', process.env.NODE_ENV);

  // CSRF Protection: Verify origin for state-changing operations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    if (!verifyOrigin(origin, referer, host)) {
      console.error('CSRF: Origin/Referer verification failed');
      console.error('Origin:', origin, 'Referer:', referer, 'Host:', host);
      return NextResponse.json(
        { error: 'Forbidden - Invalid request origin' },
        { status: 403 }
      );
    }

    // CSRF Protection: Verify CSRF token (Double Submit Cookie pattern)
    const csrfCookie = request.cookies.get('csrf_token')?.value;
    const csrfHeader = request.headers.get('x-csrf-token');

    if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
      console.error('CSRF: Token verification failed');
      console.error('Cookie present:', !!csrfCookie, 'Header present:', !!csrfHeader);
      return NextResponse.json(
        { error: 'Forbidden - Invalid CSRF token' },
        { status: 403 }
      );
    }
  }

  // Get JWT token from cookie
  const token = request.cookies.get('auth_token')?.value;
  console.log('Token present:', !!token);
  console.log('All cookies:', request.cookies.getAll());

  if (!token) {
    console.error('No token found in cookies');
    console.error('Available cookies:', request.cookies.getAll().map(c => c.name));
    return NextResponse.json(
      { error: 'Unauthorized - No token provided' },
      { status: 401 }
    );
  }

  // Verify JWT token
  const payload = await verifyJWT(token);

  if (!payload) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or expired token' },
      { status: 401 }
    );
  }

  // Token is valid - add user information to request headers
  // This allows API routes to access verified user data
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-conference-id', payload.conferenceId);
  requestHeaders.set('x-user-staff-name', payload.staffName);
  requestHeaders.set('x-user-role', payload.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Configure which routes this middleware applies to
 * Protects all API routes except /api/auth/* and /api/health
 */
export const config = {
  matcher: [
    '/api/attendees',
    '/api/attendees/:path*',
  ],
};
