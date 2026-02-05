import { google } from 'googleapis';
import { getGoogleAuth } from './google';
import { Attendee } from '@/types';

export const SHEET_NAME = 'シート1';
export const SHEETS_RANGE = `${SHEET_NAME}!A2:G`; // Adjust based on header row

export const mapRowToAttendee = (row: string[], index: number): Attendee => {
  return {
    id: row[0] || `row-${index + 2}`, // Fallback ID
    company: row[1] || '',
    name: row[2] || '',
    itemsToHandOut: row[3] || '',
    status: (row[4] as 'Checked In' | 'Not Checked In') || 'Not Checked In',
    timeStamp: row[5] || '',
    staffName: row[6] || '',
  };
};

export const getAttendees = async (spreadsheetId: string): Promise<Attendee[]> => {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: SHEETS_RANGE,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map((row, index) => mapRowToAttendee(row, index));
  } catch (error) {
    console.error('Error fetching sheets:', error);
    throw error;
  }
};

export const checkInAttendee = async (
  spreadsheetId: string,
  rowId: string,
  staffName: string
): Promise<boolean> => {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  
  // Need to find the row index again to be safe, or we pass the row index from the frontend.
  // For simplicity, assuming rowId wraps the row index or we search.
  // Let's assume passed ID is "row-{rowIndex}" for MVP simplicity if not unique ID.
  // Real implementation should search for the ID column.
  
  // Implementation: Find row by ID
  const attendees = await getAttendees(spreadsheetId);
  const rowIndex = attendees.findIndex(a => a.id === rowId);

  if (rowIndex === -1) return false;

  const actualRowNumber = rowIndex + 2; // +2 for 1-based index and header row

  const timestamp = new Date().toISOString();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!E${actualRowNumber}:G${actualRowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['Checked In', timestamp, staffName]],
    },
  });

  return true;
};
