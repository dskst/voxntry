import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkOutAttendee } from '@/lib/google-sheets';
import { getConference } from '@/config/conferences';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const conferenceId = cookieStore.get('voxntry_conf_id')?.value;

  if (!conferenceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conference = getConference(conferenceId);
  if (!conference) {
    return NextResponse.json({ error: 'Conference not found' }, { status: 404 });
  }

  const body = await request.json();
  const { rowId } = body;

  if (!rowId) {
    return NextResponse.json({ error: 'Row ID is required' }, { status: 400 });
  }

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
