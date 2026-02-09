import { NextResponse } from 'next/server';
import { conferences } from '@/config/conferences';
import bcrypt from 'bcrypt';
import { signJWT } from '@/lib/jwt';
import { LoginRequestSchema } from '@/schemas/api';
import { validateRequestBody } from '@/lib/validation';

export async function POST(request: Request) {
  // Validate request body with Zod
  const { data, error } = await validateRequestBody(request, LoginRequestSchema);
  if (error) return error;

  const { conferenceId, password, staffName } = data;

  // Find conference by ID
  const conference = conferences.find((c) => c.id === conferenceId);

  if (!conference) {
    return NextResponse.json(
      { error: 'Invalid conference ID or password' },
      { status: 401 }
    );
  }

  // Secure password comparison using bcrypt
  // Note: Passwords should be hashed using bcrypt.hash() and stored as hashes
  let isPasswordValid = false;

  try {
    // Check if stored password is a bcrypt hash (starts with $2a$, $2b$, or $2y$)
    if (conference.password.startsWith('$2')) {
      isPasswordValid = await bcrypt.compare(password, conference.password);
    } else {
      // Legacy plain-text comparison (for backward compatibility during migration)
      // This should be removed after all passwords are migrated to bcrypt hashes
      console.warn('⚠️  Plain-text password detected. Please migrate to bcrypt hashes.');
      isPasswordValid = password === conference.password;
    }
  } catch (error) {
    console.error('Password comparison error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }

  if (!isPasswordValid) {
    return NextResponse.json(
      { error: 'Invalid conference ID or password' },
      { status: 401 }
    );
  }

  // Generate JWT token with user information
  // staffName is already validated by Zod
  try {
    const token = await signJWT({
      conferenceId: conference.id,
      staffName,
      role: 'staff', // Default role, can be extended later
    });

    // Set JWT token in httpOnly cookie
    const response = NextResponse.json({ success: true, conference });

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: isProduction, // HTTPS only in production
      sameSite: 'strict' as const, // CSRF protection
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours (matches JWT expiration)
    };

    response.cookies.set('auth_token', token, cookieOptions);

    return response;
  } catch (error) {
    console.error('JWT generation error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
