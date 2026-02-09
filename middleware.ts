import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/jwt';

/**
 * Middleware to verify JWT tokens for protected API routes
 */
export async function middleware(request: NextRequest) {
  // Get JWT token from cookie
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
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
    '/api/attendees/:path*',
    '/api/ocr',
    '/api/transcribe',
  ],
};
