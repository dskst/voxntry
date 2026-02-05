import { google } from 'googleapis';
import { getGoogleAuth } from './google';
import { Attendee, SheetColumnMapping } from '@/types';

const DEFAULT_SHEET_CONFIG: SheetColumnMapping = {
  sheetName: 'シート1',
  startRow: 2,
  columns: {
    id: 0,
    company: 1,
    name: 2,
    itemsToHandOut: 3,
    status: 4,
    timeStamp: 5,
    staffName: 6,
  },
};

export const mapRowToAttendee = (
  row: string[],
  index: number,
  config: SheetColumnMapping = DEFAULT_SHEET_CONFIG
): Attendee => {
  const cols = config.columns;
  return {
    id: row[cols.id] || `row-${index + config.startRow}`, // Fallback ID
    company: row[cols.company] || '',
    name: row[cols.name] || '',
    itemsToHandOut: row[cols.itemsToHandOut] || '',
    status: (row[cols.status] as 'Checked In' | 'Not Checked In') || 'Not Checked In',
    timeStamp: row[cols.timeStamp] || '',
    staffName: row[cols.staffName] || '',
  };
};

export const getAttendees = async (
  spreadsheetId: string,
  config: SheetColumnMapping = DEFAULT_SHEET_CONFIG
): Promise<Attendee[]> => {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Calculate the range to fetch based on the config. 
  // We'll fetch from startRow to end of sheet, and up to the max column index we care about.
  // Actually, fetching 'A{startRow}:ZZ' is simpler and safe enough usually.
  const range = `${config.sheetName}!A${config.startRow}:ZZ`;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map((row, index) => mapRowToAttendee(row, index, config));
  } catch (error) {
    console.error('Error fetching sheets:', error);
    throw error;
  }
};

const getColumnLetter = (colIndex: number): string => {
  let letter = '';
  while (colIndex >= 0) {
    letter = String.fromCharCode((colIndex % 26) + 65) + letter;
    colIndex = Math.floor(colIndex / 26) - 1;
  }
  return letter;
};

export const checkInAttendee = async (
  spreadsheetId: string,
  rowId: string,
  staffName: string,
  config: SheetColumnMapping = DEFAULT_SHEET_CONFIG
): Promise<boolean> => {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  
  // Implementation: Find row by ID
  // We fetch attendees using the config to find the correct row
  const attendees = await getAttendees(spreadsheetId, config);
  const rowIndex = attendees.findIndex(a => a.id === rowId);

  if (rowIndex === -1) return false;

  const actualRowNumber = rowIndex + config.startRow; 

  const timestamp = new Date().toISOString();

  // Prepare updates for Status, TimeStamp, and StaffName
  const updates = [
    {
      range: `${config.sheetName}!${getColumnLetter(config.columns.status)}${actualRowNumber}`,
      values: [['Checked In']],
    },
    {
      range: `${config.sheetName}!${getColumnLetter(config.columns.timeStamp)}${actualRowNumber}`,
      values: [[timestamp]],
    },
    {
      range: `${config.sheetName}!${getColumnLetter(config.columns.staffName)}${actualRowNumber}`,
      values: [[staffName]],
    },
  ];

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates,
    },
  });

  return true;
};
