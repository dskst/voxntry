/**
 * Mock Google Sheets API
 *
 * Based on googleapis v171.2.0 (see package.json)
 * Mock structure created: 2026-02-09
 *
 * IMPORTANT: If googleapis is upgraded, verify mock structure matches:
 * - google.auth.GoogleAuth interface
 * - google.sheets() return type
 * - spreadsheets.values.get/batchUpdate signatures
 *
 * To verify: Check node_modules/googleapis/build/src/apis/sheets/v4.d.ts
 *
 * MAINTENANCE:
 * - When googleapis is upgraded, run manual verification:
 *   1. Check types in node_modules/googleapis/build/src/apis/sheets/v4.d.ts
 *   2. Update mock if structure changed
 *   3. Update version number in this comment
 *   4. Re-run all tests
 */

import { vi } from 'vitest';

/**
 * Mock Google Auth client
 */
export const mockAuthClient = {
  // Add auth methods as needed
};

/**
 * Mock Google Sheets client
 */
export const mockSheetsClient = {
  spreadsheets: {
    values: {
      get: vi.fn(),
      batchUpdate: vi.fn(),
    },
  },
};

/**
 * Mock Google Sheets responses
 */
export const mockSheetResponses = {
  /**
   * Sample attendees data
   * Column mapping: [id(0), attribute(1), affiliation(2), name(3), nameKana(4), items(5), bodySize(6), novelties(7), memo(8), checkedIn(9), checkedInAt(10), staffName(11)]
   */
  attendees: {
    data: {
      values: [
        // id, attribute, affiliation, name, nameKana, items, bodySize, novelties, memo, checkedIn, checkedInAt, staffName
        ['001', '一般', 'テスト会社', '山田太郎', 'やまだ たろう', 'item1,item2', '', '', '', 'TRUE', '2026-01-01T10:00:00Z', 'Staff A'],
        ['002', '登壇者', '別会社', '鈴木花子', 'すずき はなこ', 'item3', '', '', '', 'FALSE', '', ''],
        ['003', '一般', 'Test Corp', 'John Doe', '', 'item4,item5', '', '', '', 'TRUE', '2026-01-02T11:00:00Z', 'Staff B'],
      ],
    },
  },

  /**
   * Empty sheet
   */
  empty: {
    data: {
      values: [],
    },
  },

  /**
   * Successful batch update
   */
  batchUpdateSuccess: {
    data: {
      replies: [],
      spreadsheetId: 'test-sheet-id',
    },
  },
};

/**
 * Mock Google Sheets errors
 */
export const mockSheetErrors = {
  /**
   * Authentication error
   */
  authError: {
    code: 401,
    message: 'Invalid credentials',
  },

  /**
   * Rate limit error
   */
  rateLimitError: {
    code: 429,
    message: 'Rate limit exceeded',
  },

  /**
   * Invalid grant error
   */
  invalidGrantError: {
    code: 400,
    response: {
      data: {
        error_description: 'invalid_grant: Token has been expired or revoked.',
      },
    },
  },

  /**
   * Server error
   */
  serverError: {
    code: 500,
    message: 'Internal server error',
  },
};

/**
 * Setup Google Sheets mock for tests
 *
 * @example
 * beforeEach(() => {
 *   setupGoogleSheetsMock();
 *   // Mock will return sample attendees by default
 * });
 */
export function setupGoogleSheetsMock() {
  // Reset mocks
  mockSheetsClient.spreadsheets.values.get.mockReset();
  mockSheetsClient.spreadsheets.values.batchUpdate.mockReset();

  // Default: Return sample attendees
  mockSheetsClient.spreadsheets.values.get.mockResolvedValue(
    mockSheetResponses.attendees
  );

  // Default: Batch update succeeds
  mockSheetsClient.spreadsheets.values.batchUpdate.mockResolvedValue(
    mockSheetResponses.batchUpdateSuccess
  );

  // Mock the googleapis module
  vi.mock('googleapis', () => ({
    google: {
      auth: {
        GoogleAuth: vi.fn(() => mockAuthClient),
      },
      sheets: vi.fn(() => mockSheetsClient),
    },
  }));

  // Mock getGoogleAuth
  vi.mock('@/lib/google', () => ({
    getGoogleAuth: vi.fn(() => mockAuthClient),
  }));
}

/**
 * Mock Google Sheets get to return empty data
 */
export function mockEmptySheet() {
  mockSheetsClient.spreadsheets.values.get.mockResolvedValue(
    mockSheetResponses.empty
  );
}

/**
 * Mock Google Sheets get to throw authentication error
 */
export function mockAuthenticationError() {
  mockSheetsClient.spreadsheets.values.get.mockRejectedValue(
    mockSheetErrors.authError
  );
}

/**
 * Mock Google Sheets get to throw rate limit error
 */
export function mockRateLimitError() {
  mockSheetsClient.spreadsheets.values.get.mockRejectedValue(
    mockSheetErrors.rateLimitError
  );
}

/**
 * Mock Google Sheets batch update to fail
 */
export function mockBatchUpdateError() {
  mockSheetsClient.spreadsheets.values.batchUpdate.mockRejectedValue(
    mockSheetErrors.serverError
  );
}

/**
 * Verify Google Sheets get was called with expected parameters
 */
export function expectSheetGetCalled(spreadsheetId: string, range: string) {
  expect(mockSheetsClient.spreadsheets.values.get).toHaveBeenCalledWith(
    expect.objectContaining({
      spreadsheetId,
      range,
    })
  );
}

/**
 * Verify Google Sheets batch update was called
 */
export function expectBatchUpdateCalled(spreadsheetId: string) {
  expect(mockSheetsClient.spreadsheets.values.batchUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      spreadsheetId,
    })
  );
}
