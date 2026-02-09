import { NextResponse } from 'next/server';
import { getConferences, getConference } from '@/lib/config-loader';
import bcrypt from 'bcrypt';
import { signJWT } from '@/lib/jwt';
import { LoginRequestSchema } from '@/schemas/api';
import { validateRequestBody } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { generateCsrfToken } from '@/lib/csrf';

// Create rate limiter instance
// 5 login attempts per minute per IP address
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Track up to 500 unique IPs
});

export async function POST(request: Request) {
  // Rate limiting check (before expensive operations)
  const clientIp = getClientIp(request);

  try {
    await limiter.check(5, clientIp); // 5 requests per minute
  } catch {
    return NextResponse.json(
      {
        error: 'Too many login attempts. Please try again later.',
        retryAfter: 60, // seconds
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      }
    );
  }

  // Validate request body with Zod
  const { data, error } = await validateRequestBody(request, LoginRequestSchema);
  if (error) return error;

  const { conferenceId, password, staffName } = data;

  // Load conferences and find by ID
  const conferences = getConferences();
  const conference = getConference(conferenceId, conferences);

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
    // Remove password from response for security
    const { password: _, ...conferenceWithoutPassword } = conference;
    const response = NextResponse.json({
      success: true,
      conference: conferenceWithoutPassword
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: isProduction, // HTTPS only in production
      sameSite: 'strict' as const, // Always use 'strict' for CSRF protection
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours (matches JWT expiration)
    };

    response.cookies.set('auth_token', token, cookieOptions);
    console.log('Cookie set with options:', cookieOptions);
    console.log('Token length:', token.length);

    // Generate and set CSRF token (Double Submit Cookie pattern)
    const csrfToken = generateCsrfToken();
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: false, // Must be readable by JavaScript
      secure: isProduction,
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours (same as auth_token)
    });
    console.log('CSRF token generated and set');

    return response;
  } catch (error) {
    console.error('JWT generation error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
