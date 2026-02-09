import { google } from 'googleapis';
import { getGoogleAuth } from './google';
import { Attendee, SheetColumnMapping } from '@/types';
import {
  mapRowToAttendee,
  formatBoolean,
  getColumnLetter,
  calculateSheetRange,
  buildCellRange,
} from './google-sheets-parser';

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

export const getAttendees = async (
  spreadsheetId: string,
  config: SheetColumnMapping = DEFAULT_SHEET_CONFIG
): Promise<Attendee[]> => {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Calculate the range to fetch based on the config.
  const range = calculateSheetRange(config);

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
      range: buildCellRange(config.sheetName, config.columns.checkedIn, actualRowNumber),
      values: [[formatBoolean(true)]], // Write 'TRUE' to Google Sheets
    },
    {
      range: buildCellRange(config.sheetName, config.columns.checkedInAt, actualRowNumber),
      values: [[timestamp]],
    },
    {
      range: buildCellRange(config.sheetName, config.columns.staffName, actualRowNumber),
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
      range: buildCellRange(config.sheetName, config.columns.checkedIn, actualRowNumber),
      values: [[formatBoolean(false)]], // Write 'FALSE' to Google Sheets
    },
    {
      range: buildCellRange(config.sheetName, config.columns.checkedInAt, actualRowNumber),
      values: [['']],
    },
    {
      range: buildCellRange(config.sheetName, config.columns.staffName, actualRowNumber),
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
