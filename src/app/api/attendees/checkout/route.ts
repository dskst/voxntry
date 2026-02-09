import { NextResponse } from 'next/server';
import { checkOutAttendee } from '@/lib/google-sheets';
import { getConference } from '@/config/conferences';
import { CheckOutRequestSchema } from '@/schemas/api';
import { validateRequestBody } from '@/lib/validation';

export async function POST(request: Request) {
  // Get verified user information from middleware-injected headers
  const conferenceId = request.headers.get('x-user-conference-id');

  if (!conferenceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conference = getConference(conferenceId);
  if (!conference) {
    return NextResponse.json({ error: 'Conference not found' }, { status: 404 });
  }

  // Validate request body with Zod
  const { data, error } = await validateRequestBody(request, CheckOutRequestSchema);
  if (error) return error;

  const { rowId } = data;

  try {
    const success = await checkOutAttendee(
      conference.spreadsheetId,
      rowId,
      conference.sheetConfig
    );
    if (!success) {
      return NextResponse.json({ error: 'Attendee not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to check out:', error);
    return NextResponse.json({ error: 'Failed to update sheet' }, { status: 500 });
  }
}
