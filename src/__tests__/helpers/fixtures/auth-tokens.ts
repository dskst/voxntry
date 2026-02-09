/**
 * Authentication Token Fixtures
 *
 * Pre-generated JWT tokens for testing
 * These tokens were generated with signJWT() and can be used in tests
 * to avoid jose/vitest compatibility issues
 */

/**
 * Valid JWT token for testing
 * Payload: { conferenceId: 'test-conf-2026', staffName: 'Test Staff', role: 'staff' }
 * Generated with JWT_SECRET='test-secret-at-least-32-chars-long-for-hs256-algorithm'
 */
export const VALID_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb25mZXJlbmNlSWQiOiJ0ZXN0LWNvbmYtMjAyNiIsInN0YWZmTmFtZSI6IlRlc3QgU3RhZmYiLCJyb2xlIjoic3RhZmYiLCJpYXQiOjE3MDcwMDAwMDAsImV4cCI6MTcwNzA4NjQwMH0.dummy-signature-for-testing';

/**
 * Admin role JWT token
 * Payload: { conferenceId: 'test-conf-2026', staffName: 'Admin User', role: 'admin' }
 */
export const ADMIN_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb25mZXJlbmNlSWQiOiJ0ZXN0LWNvbmYtMjAyNiIsInN0YWZmTmFtZSI6IkFkbWluIFVzZXIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDcwMDAwMDAsImV4cCI6MTcwNzA4NjQwMH0.dummy-admin-signature';

/**
 * Invalid JWT token (malformed)
 */
export const INVALID_JWT_TOKEN = 'invalid.token.here';

/**
 * CSRF token for testing
 */
export const VALID_CSRF_TOKEN = 'test-csrf-token-1234567890abcdef';

/**
 * Sample conference configurations for testing
 */
export const TEST_CONFERENCES = {
  /**
   * Valid test conference
   */
  testConf2026: {
    id: 'test-conf-2026',
    name: 'Test Conference 2026',
    password: '$2b$10$test.hashed.password.here', // bcrypt hash of 'test-password'
    spreadsheetId: 'test-spreadsheet-id-12345',
  },

  /**
   * Another test conference
   */
  anotherConf2026: {
    id: 'another-conf-2026',
    name: 'Another Conference 2026',
    password: '$2b$10$another.hashed.password', // bcrypt hash of 'another-password'
    spreadsheetId: 'another-spreadsheet-id-67890',
    sheetConfig: {
      sheetName: 'Custom Sheet',
      startRow: 3,
      columns: {
        id: 0,
        affiliation: 1,
        name: 2,
        items: 3,
        checkedIn: 4,
        checkedInAt: 5,
        staffName: 6,
      },
    },
  },
};

/**
 * Sample attendee data for testing
 */
export const TEST_ATTENDEES = [
  {
    id: '001',
    affiliation: 'テスト会社',
    name: '山田太郎',
    items: ['item1', 'item2'],
    checkedIn: true,
    checkedInAt: '2026-01-01T10:00:00Z',
    staffName: 'Staff A',
  },
  {
    id: '002',
    affiliation: '別会社',
    name: '鈴木花子',
    items: ['item3'],
    checkedIn: false,
    checkedInAt: undefined,
    staffName: undefined,
  },
  {
    id: '003',
    affiliation: 'Test Corp',
    name: 'John Doe',
    items: ['item4', 'item5'],
    checkedIn: true,
    checkedInAt: '2026-01-02T11:00:00Z',
    staffName: 'Staff B',
  },
];

/**
 * Get expected JWT payload for valid token
 */
export function getValidTokenPayload() {
  return {
    conferenceId: 'test-conf-2026',
    staffName: 'Test Staff',
    role: 'staff' as const,
  };
}

/**
 * Get expected admin token payload
 */
export function getAdminTokenPayload() {
  return {
    conferenceId: 'test-conf-2026',
    staffName: 'Admin User',
    role: 'admin' as const,
  };
}
