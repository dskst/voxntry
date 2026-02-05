import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAttendees } from '@/lib/google-sheets';
import { getConference } from '@/config/conferences';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const conferenceId = cookieStore.get('voxntry_conf_id')?.value;

  if (!conferenceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conference = getConference(conferenceId);
  if (!conference) {
    return NextResponse.json({ error: 'Conference not found' }, { status: 404 });
  }

  try {
    const attendees = await getAttendees(conference.spreadsheetId);
    return NextResponse.json({ attendees });
  } catch (error) {
    console.error('Failed to fetch attendees:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
