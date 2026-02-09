import { Attendee, SheetColumnMapping } from '@/types';

/**
 * Parse comma-separated string into array
 * Handles both full-width and half-width commas
 */
export const parseCommaSeparated = (value: string): string[] => {
  if (!value || value.trim() === '') return [];
  // Normalize full-width comma to half-width
  const normalized = value.replace(/、/g, ',');
  return normalized.split(',').map(item => item.trim()).filter(item => item !== '');
};

/**
 * Parse string to boolean
 * Supports multiple true values for flexibility
 */
export const parseBoolean = (value: string | undefined): boolean => {
  if (!value) return false;
  const TRUE_VALUES = ['TRUE', 'True', 'true', 'YES', 'Yes', 'yes', 'はい', '○', '1'];
  return TRUE_VALUES.includes(value.trim());
};

/**
 * Format boolean to string for Google Sheets
 */
export const formatBoolean = (value: boolean): string => {
  return value ? 'TRUE' : 'FALSE';
};

/**
 * Convert column index to Excel-style column letter (A, B, C, ..., AA, AB, ...)
 */
export const getColumnLetter = (colIndex: number): string => {
  let letter = '';
  while (colIndex >= 0) {
    letter = String.fromCharCode((colIndex % 26) + 65) + letter;
    colIndex = Math.floor(colIndex / 26) - 1;
  }
  return letter;
};

/**
 * Map a raw Google Sheets row to an Attendee object
 */
export const mapRowToAttendee = (
  row: string[],
  index: number,
  config: SheetColumnMapping
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

/**
 * Calculate Google Sheets range string from config
 */
export const calculateSheetRange = (config: SheetColumnMapping): string => {
  return `${config.sheetName}!A${config.startRow}:ZZ`;
};

/**
 * Build cell range for a specific column and row
 */
export const buildCellRange = (
  sheetName: string,
  columnIndex: number,
  rowNumber: number
): string => {
  return `${sheetName}!${getColumnLetter(columnIndex)}${rowNumber}`;
};
