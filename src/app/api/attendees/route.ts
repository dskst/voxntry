import { NextResponse } from 'next/server';
import { getAttendees } from '@/lib/google-sheets';
import { getConferences, getConference } from '@/lib/config-loader';

export async function GET(request: Request) {
  // Get verified user information from middleware-injected headers
  const conferenceId = request.headers.get('x-user-conference-id');

  if (!conferenceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conferences = getConferences();
  const conference = getConference(conferenceId, conferences);
  if (!conference) {
    return NextResponse.json({ error: 'Conference not found' }, { status: 404 });
  }

  try {
    const attendees = await getAttendees(conference.spreadsheetId, conference.sheetConfig);
    return NextResponse.json({ attendees });
  } catch (error) {
    console.error('Failed to fetch attendees:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
