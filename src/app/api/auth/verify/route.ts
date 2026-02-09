import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';

/**
 * Verify authentication token
 * This endpoint checks if the user has a valid JWT token
 */
export async function GET(request: NextRequest) {
  console.log('=== Verify endpoint called ===');
  console.log('All cookies:', request.cookies.getAll());
  console.log('Cookie header:', request.headers.get('cookie'));

  // Get JWT token from cookie
  const token = request.cookies.get('auth_token')?.value;
  console.log('Token present:', !!token);

  if (!token) {
    return NextResponse.json(
      { authenticated: false, error: 'No token provided' },
      { status: 401 }
    );
  }

  // Verify JWT token
  const payload = await verifyJWT(token);

  if (!payload) {
    return NextResponse.json(
      { authenticated: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      conferenceId: payload.conferenceId,
      staffName: payload.staffName,
      role: payload.role,
    },
  });
}
