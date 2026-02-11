import { Attendee, SheetColumnMapping } from '@/types';
import { AttendeeAttributesSchema } from '@/schemas/conference';

/**
 * Parse comma-separated string into array
 * Handles both full-width and half-width commas
 * Returns undefined if no valid values (consistent with optional field behavior)
 */
export const parseCommaSeparated = (value: string): string[] | undefined => {
  if (!value || value.trim() === '') return undefined;
  // Normalize full-width comma to half-width
  const normalized = value.replace(/、/g, ',');
  const parsed = normalized.split(',').map(item => item.trim()).filter(item => item !== '');
  return parsed.length > 0 ? parsed : undefined;
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
 * Format timestamp for Google Sheets in the specified timezone
 * @param date - Date object to format
 * @param timezone - IANA timezone identifier (e.g., "Asia/Tokyo", "America/New_York")
 * @returns Formatted timestamp string in "YYYY-MM-DD HH:mm:ss" format for Google Sheets datetime type
 *
 * @example
 * formatTimestampForSheets(new Date(), "Asia/Tokyo") // "2026-02-11 19:30:45"
 * formatTimestampForSheets(new Date(), "America/New_York") // "2026-02-11 05:30:45"
 */
export const formatTimestampForSheets = (date: Date, timezone: string = 'Asia/Tokyo'): string => {
  // Use Intl.DateTimeFormat to format the date in the specified timezone
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // sv-SE locale formats as "YYYY-MM-DD HH:mm:ss" which is perfect for Google Sheets
  return formatter.format(date);
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

  // Parse attributes from comma-separated string
  const attributeString = cols.attribute !== undefined ? row[cols.attribute] || '' : '';
  const attributes = parseCommaSeparated(attributeString);

  // Validate attributes constraints
  if (attributes !== undefined) {
    const validation = AttendeeAttributesSchema.safeParse(attributes);
    if (!validation.success) {
      console.warn(
        `Invalid attributes for attendee at row ${index + config.startRow}:`,
        validation.error.issues.map(i => i.message).join(', ')
      );
      // Truncate to meet constraints rather than failing
      const truncated = attributes.slice(0, 5).map(attr => attr.substring(0, 50));
      return {
        id: row[cols.id] || `row-${index + config.startRow}`,
        affiliation: row[cols.affiliation] || '',
        affiliationKana: cols.affiliationKana !== undefined ? row[cols.affiliationKana] : undefined,
        attributes: truncated.length > 0 ? truncated : undefined,
        name: row[cols.name] || '',
        nameKana: cols.nameKana !== undefined ? row[cols.nameKana] : undefined,
        items: parseCommaSeparated(row[cols.items] || '') || [],
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
    }
  }

  return {
    id: row[cols.id] || `row-${index + config.startRow}`, // Fallback ID
    affiliation: row[cols.affiliation] || '',
    affiliationKana: cols.affiliationKana !== undefined ? row[cols.affiliationKana] : undefined,
    attributes,
    name: row[cols.name] || '',
    nameKana: cols.nameKana !== undefined ? row[cols.nameKana] : undefined,
    items: parseCommaSeparated(row[cols.items] || '') || [],
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
