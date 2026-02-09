import { NextResponse } from 'next/server';
import { conferences } from '@/config/conferences';

export async function POST(request: Request) {
  const body = await request.json();
  const { conferenceId, password, staffName } = body;

  const conference = conferences.find(
    (c) => c.id === conferenceId && c.password === password
  );

  if (!conference) {
    return NextResponse.json(
      { error: 'Invalid conference ID or password' },
      { status: 401 }
    );
  }

  if (!staffName) {
    return NextResponse.json(
      { error: 'Staff name is required' },
      { status: 400 }
    );
  }

  // Set cookies for session
  const response = NextResponse.json({ success: true, conference });

  // In a real app, use a secure signed token (JWT)
  // For MVP/Demo, simple cookies are acceptable but should be httpOnly
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  };

  response.cookies.set('voxntry_conf_id', conference.id, cookieOptions);
  response.cookies.set('voxntry_staff_name', staffName, cookieOptions);
  
  return response;
}
