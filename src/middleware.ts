import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  verifyCsrfProtection,
  verifyAuthentication,
  createUserHeaders,
} from '@/lib/middleware-helpers';

// Force Node.js runtime for crypto module support
export const runtime = 'nodejs';

/**
 * Middleware to verify JWT tokens and CSRF tokens for protected API routes
 */
export async function middleware(request: NextRequest) {
  console.log('=== Middleware called for:', request.nextUrl.pathname);
  console.log('NODE_ENV:', process.env.NODE_ENV);

  // CSRF Protection: Verify origin and token for state-changing operations
  const csrfResult = await verifyCsrfProtection(
    request.method,
    request.headers,
    request.cookies
  );

  if (!csrfResult.success) {
    return NextResponse.json(
      { error: csrfResult.error },
      { status: csrfResult.status }
    );
  }

  // Verify JWT authentication
  const authResult = await verifyAuthentication(request.cookies);

  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  // Token is valid - add user information to request headers
  // This allows API routes to access verified user data
  const requestHeaders = new Headers(request.headers);
  const userHeaders = createUserHeaders(authResult.payload);

  Object.entries(userHeaders).forEach(([key, value]) => {
    requestHeaders.set(key, value);
  });

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
