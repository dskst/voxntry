import { NextResponse } from 'next/server';
import { checkInAttendee } from '@/lib/google-sheets';
import { getConferences, getConference } from '@/lib/config-loader';
import { CheckInRequestSchema } from '@/schemas/api';
import { validateRequestBody } from '@/lib/validation';

export async function POST(request: Request) {
  // Get verified user information from middleware-injected headers
  const conferenceId = request.headers.get('x-user-conference-id');
  const encodedStaffName = request.headers.get('x-user-staff-name');

  if (!conferenceId || !encodedStaffName) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Decode Base64-encoded staffName (supports non-ASCII characters like Japanese)
  const staffName = Buffer.from(encodedStaffName, 'base64').toString('utf-8');

  const conferences = getConferences();
  const conference = getConference(conferenceId, conferences);
  if (!conference) {
    return NextResponse.json({ error: 'Conference not found' }, { status: 404 });
  }

  // Validate request body with Zod
  const { data, error } = await validateRequestBody(request, CheckInRequestSchema);
  if (error) return error;

  const { rowId } = data;

  try {
    const success = await checkInAttendee(
      conference.spreadsheetId,
      rowId,
      staffName,
      conference.sheetConfig,
      conference.timezone // Use conference-specific timezone, defaults to 'Asia/Tokyo' in the function
    );
    if (!success) {
      return NextResponse.json({ error: 'Attendee not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to check in:', error);
    return NextResponse.json({ error: 'Failed to update sheet' }, { status: 500 });
  }
}
