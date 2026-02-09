import { vi } from 'vitest';

/**
 * Helper to create mock Google Sheets API responses
 */
export function createMockSheetsResponse(data: string[][]) {
  return {
    data: {
      values: data,
    },
  };
}

/**
 * Helper to create mock Google Sheets client
 */
export function createMockGoogleSheetsClient() {
  return {
    spreadsheets: {
      values: {
        get: vi.fn(),
        update: vi.fn(),
        append: vi.fn(),
      },
    },
  };
}

/**
 * Sample attendee data for testing
 */
export const mockAttendeeData = [
  ['ID', 'Name', 'Email', 'Company', 'CheckedIn', 'CheckInTime', 'CheckOutTime'],
  ['001', 'John Doe', 'john@example.com', 'ACME Corp', 'FALSE', '', ''],
  ['002', 'Jane Smith', 'jane@example.com', 'Tech Inc', 'TRUE', '2026-02-09T09:00:00Z', ''],
  ['003', 'Bob Johnson', 'bob@example.com', 'Dev LLC', 'FALSE', '', ''],
];

/**
 * Helper to create mock attendee response
 */
export function createMockAttendee(overrides: Partial<{
  id: string;
  name: string;
  email: string;
  company: string;
  checkedIn: boolean;
  checkInTime: string;
  checkOutTime: string;
}> = {}) {
  return {
    id: overrides.id || '001',
    name: overrides.name || 'John Doe',
    email: overrides.email || 'john@example.com',
    company: overrides.company || 'ACME Corp',
    checkedIn: overrides.checkedIn || false,
    checkInTime: overrides.checkInTime || null,
    checkOutTime: overrides.checkOutTime || null,
  };
}
