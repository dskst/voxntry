import { google } from 'googleapis';
import { getGoogleAuth } from './google';
import { Attendee, SheetColumnMapping } from '@/types';
import {
  mapRowToAttendee,
  formatBoolean,
  calculateSheetRange,
  buildCellRange,
  formatTimestampForSheets,
} from './google-sheets-parser';

const DEFAULT_SHEET_CONFIG: SheetColumnMapping = {
  sheetName: 'シート1',
  startRow: 2,
  columns: {
    id: 0,
    attribute: 1,
    affiliation: 2,
    affiliationKana: 3,
    name: 4,
    nameKana: 5,
    items: 6,
    bodySize: 7,
    novelties: 8,
    memo: 9,
    checkedIn: 10,
    checkedInAt: 11,
    staffName: 12,
    attendsReception: 13,
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
  } catch (error: unknown) {
    console.error('Error fetching sheets:', error);

    // Handle authentication errors
    if (error && typeof error === 'object' && 'code' in error && (error.code === 400 || error.code === 401)) {
      const err = error as { response?: { data?: { error_description?: string } }; message?: string };
      const errorMsg = err?.response?.data?.error_description || err?.message || 'Authentication error';

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
  config: SheetColumnMapping = DEFAULT_SHEET_CONFIG,
  timezone: string = 'Asia/Tokyo'
): Promise<boolean> => {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Implementation: Find row by ID
  // We fetch attendees using the config to find the correct row
  const attendees = await getAttendees(spreadsheetId, config);
  const rowIndex = attendees.findIndex(a => a.id === rowId);

  if (rowIndex === -1) return false;

  const actualRowNumber = rowIndex + config.startRow;

  // Format timestamp in the specified timezone for Google Sheets datetime type
  const timestamp = formatTimestampForSheets(new Date(), timezone);

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
