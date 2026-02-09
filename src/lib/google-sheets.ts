import { google } from 'googleapis';
import { getGoogleAuth } from './google';
import { Attendee, SheetColumnMapping } from '@/types';

const DEFAULT_SHEET_CONFIG: SheetColumnMapping = {
  sheetName: 'シート1',
  startRow: 2,
  columns: {
    id: 0,
    attribute: 1,
    affiliation: 2,
    name: 3,
    nameKana: 4,
    items: 5,
    bodySize: 6,
    novelties: 7,
    memo: 8,
    checkedIn: 9,
    checkedInAt: 10,
    staffName: 11,
    attendsReception: 12,
  },
};

/**
 * Parse comma-separated string into array
 * Handles both full-width and half-width commas
 */
const parseCommaSeparated = (value: string): string[] => {
  if (!value || value.trim() === '') return [];
  // Normalize full-width comma to half-width
  const normalized = value.replace(/、/g, ',');
  return normalized.split(',').map(item => item.trim()).filter(item => item !== '');
};

/**
 * Parse string to boolean
 * Supports multiple true values for flexibility
 */
const parseBoolean = (value: string | undefined): boolean => {
  if (!value) return false;
  const TRUE_VALUES = ['TRUE', 'True', 'true', 'YES', 'Yes', 'yes', 'はい', '○', '1'];
  return TRUE_VALUES.includes(value.trim());
};

/**
 * Format boolean to string for Google Sheets
 */
const formatBoolean = (value: boolean): string => {
  return value ? 'TRUE' : 'FALSE';
};

export const mapRowToAttendee = (
  row: string[],
  index: number,
  config: SheetColumnMapping = DEFAULT_SHEET_CONFIG
): Attendee => {
  const cols = config.columns;
  return {
    id: row[cols.id] || `row-${index + config.startRow}`, // Fallback ID
    affiliation: row[cols.affiliation] || '',
    attribute: cols.attribute !== undefined ? row[cols.attribute] : undefined,
    name: row[cols.name] || '',
    nameKana: cols.nameKana !== undefined ? row[cols.nameKana] : undefined,
    items: parseCommaSeparated(row[cols.items] || ''),
    bodySize: cols.bodySize !== undefined ? row[cols.bodySize] : undefined,
    novelties: cols.novelties !== undefined ? row[cols.novelties] : undefined,
    memo: cols.memo !== undefined ? row[cols.memo] : undefined,
    attendsReception: cols.attendsReception !== undefined
      ? parseBoolean(row[cols.attendsReception])
      : undefined,
    checkedIn: parseBoolean(row[cols.checkedIn]),
    checkedInAt: row[cols.checkedInAt] || undefined,
    staffName: row[cols.staffName] || undefined,
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
  } catch (error: any) {
    console.error('Error fetching sheets:', error);

    // Handle authentication errors
    if (error?.code === 400 || error?.code === 401) {
      const errorMsg = error?.response?.data?.error_description || error?.message || 'Authentication error';

      if (errorMsg.includes('invalid_rapt') || errorMsg.includes('invalid_grant')) {
        throw new Error(
          'Google authentication expired. Please run "gcloud auth application-default login" or set up a service account.'
        );
      }

      throw new Error(`Google Sheets authentication failed: ${errorMsg}`);
    }

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

  // Prepare updates for checkedIn, checkedInAt, and StaffName
  const updates = [
    {
      range: `${config.sheetName}!${getColumnLetter(config.columns.checkedIn)}${actualRowNumber}`,
      values: [[formatBoolean(true)]], // Write 'TRUE' to Google Sheets
    },
    {
      range: `${config.sheetName}!${getColumnLetter(config.columns.checkedInAt)}${actualRowNumber}`,
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

export const checkOutAttendee = async (
  spreadsheetId: string,
  rowId: string,
  config: SheetColumnMapping = DEFAULT_SHEET_CONFIG
): Promise<boolean> => {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Get all attendees to find the row
  const attendees = await getAttendees(spreadsheetId, config);
  const rowIndex = attendees.findIndex((a) => a.id === rowId);

  if (rowIndex === -1) {
    return false;
  }

  const actualRowNumber = rowIndex + config.startRow;

  // Update checkedIn to FALSE and clear checkedInAt and staffName
  const updates = [
    {
      range: `${config.sheetName}!${getColumnLetter(config.columns.checkedIn)}${actualRowNumber}`,
      values: [[formatBoolean(false)]], // Write 'FALSE' to Google Sheets
    },
    {
      range: `${config.sheetName}!${getColumnLetter(config.columns.checkedInAt)}${actualRowNumber}`,
      values: [['']],
    },
    {
      range: `${config.sheetName}!${getColumnLetter(config.columns.staffName)}${actualRowNumber}`,
      values: [['']],
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
