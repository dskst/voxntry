import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/attendees/route';
import {
  createTestRequest,
  extractResponse,
} from '@/__tests__/helpers/api-test-utils';
import {
  mockSheetResponses,
  mockSheetErrors,
} from '@/__tests__/helpers/mocks/google-sheets';

// Mock Google Sheets at module level
const mockSheetsClient = {
  spreadsheets: {
    values: {
      get: vi.fn(),
      batchUpdate: vi.fn(),
    },
  },
};

vi.mock('googleapis', () => ({
  google: {
    sheets: vi.fn(() => mockSheetsClient),
    auth: {
      GoogleAuth: vi.fn(),
    },
  },
}));

vi.mock('@/lib/google', () => ({
  getGoogleAuth: vi.fn(() => ({})),
}));

// Mock config loader at module level
vi.mock('@/lib/config-loader', async () => {
  const actual = await vi.importActual('@/lib/config-loader');
  return {
    ...actual,
    getConferences: () => [
      {
        id: 'test-conf-2026',
        name: 'Test Conference 2026',
        password: 'test-password',
        spreadsheetId: 'test-spreadsheet-id-12345',
        sheetConfig: {
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
        },
      },
    ],
    getConference: (id: string, conferences: any[]) => {
      return conferences.find(c => c.id === id);
    },
  };
});

describe('GET /api/attendees', () => {
  beforeEach(() => {
    // Set up environment
    vi.stubEnv('JWT_SECRET', 'test-secret-at-least-32-chars-long-for-hs256-algorithm');
    vi.stubEnv('TEST_CONF_PASSWORD', 'test-password');

    // Reset mocks
    mockSheetsClient.spreadsheets.values.get.mockReset();
    mockSheetsClient.spreadsheets.values.batchUpdate.mockReset();

    // Default: Return sample attendees
    mockSheetsClient.spreadsheets.values.get.mockResolvedValue(
      mockSheetResponses.attendees
    );
  });

  describe('Authentication required', () => {
    it('should return 401 when no conference ID in headers', async () => {
      const request = createTestRequest({
        url: 'http://localhost:3000/api/attendees',
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(401);
      expect(result.body.error).toBe('Unauthorized');
    });

    it('should require middleware-injected headers', async () => {
      // This tests that the endpoint expects headers from middleware
      const request = createTestRequest({
        url: 'http://localhost:3000/api/attendees',
        headers: {
          // No x-user-conference-id header
        },
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('Conference validation', () => {
    it('should return 404 for non-existent conference', async () => {
      const request = createTestRequest({
        url: 'http://localhost:3000/api/attendees',
        headers: {
          'x-user-conference-id': 'non-existent-conf',
          'x-user-staff-name': 'Test Staff',
          'x-user-role': 'staff',
        },
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(404);
      expect(result.body.error).toBe('Conference not found');
    });

    it('should validate conference exists before fetching data', async () => {
      const request = createTestRequest({
        url: 'http://localhost:3000/api/attendees',
        headers: {
          'x-user-conference-id': 'invalid-conf-id',
        },
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(404);
      // Google Sheets should not be called for invalid conference
      expect(mockSheetsClient.spreadsheets.values.get).not.toHaveBeenCalled();
    });
  });

  describe('Successful data retrieval', () => {
    it('should return 200 with attendees list', async () => {
      const request = createTestRequest({
        url: 'http://localhost:3000/api/attendees',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
          'x-user-staff-name': 'Test Staff',
          'x-user-role': 'staff',
        },
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('attendees');
      expect(Array.isArray(result.body.attendees)).toBe(true);
    });

    it('should return mapped attendee data', async () => {
      const request = createTestRequest({
        url: 'http://localhost:3000/api/attendees',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(200);
      expect(result.body.attendees.length).toBeGreaterThan(0);

      // Check first attendee structure
      const attendee = result.body.attendees[0];
      expect(attendee).toHaveProperty('id');
      expect(attendee).toHaveProperty('name');
      expect(attendee).toHaveProperty('affiliation');
      expect(attendee).toHaveProperty('checkedIn');
    });

    it('should parse comma-separated items', async () => {
      const request = createTestRequest({
        url: 'http://localhost:3000/api/attendees',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(200);

      // Find attendee with items
      const attendeeWithItems = result.body.attendees.find(
        (a: any) => a.items && a.items.length > 0
      );

      if (attendeeWithItems) {
        expect(Array.isArray(attendeeWithItems.items)).toBe(true);
      }
    });

    it('should parse boolean checkedIn status', async () => {
      const request = createTestRequest({
        url: 'http://localhost:3000/api/attendees',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(200);

      // Check that checkedIn is boolean
      result.body.attendees.forEach((attendee: any) => {
        expect(typeof attendee.checkedIn).toBe('boolean');
      });
    });

    it('should handle Japanese characters correctly', async () => {
      const request = createTestRequest({
        url: 'http://localhost:3000/api/attendees',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(200);

      // Check for Japanese characters in sample data
      const japaneseAttendee = result.body.attendees.find(
        (a: any) => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(a.name)
      );

      if (japaneseAttendee) {
        expect(japaneseAttendee.name).toBeDefined();
        expect(japaneseAttendee.affiliation).toBeDefined();
      }
    });
  });

  describe('Empty data handling', () => {
    it('should return empty array when no attendees', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue(
        mockSheetResponses.empty
      );

      const request = createTestRequest({
        url: 'http://localhost:3000/api/attendees',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(200);
      expect(result.body.attendees).toEqual([]);
    });

    it('should not fail on empty spreadsheet', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue(
        mockSheetResponses.empty
      );

      const request = createTestRequest({
        url: 'http://localhost:3000/api/attendees',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('attendees');
    });
  });

  describe('Error handling', () => {
    it('should return 500 on Google Sheets API failure', async () => {
      mockSheetsClient.spreadsheets.values.get.mockRejectedValue(
        mockSheetErrors.authError
      );

      const request = createTestRequest({
        url: 'http://localhost:3000/api/attendees',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(500);
      expect(result.body.error).toBe('Failed to fetch data');
    });

    it('should log error details on failure', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSheetsClient.spreadsheets.values.get.mockRejectedValue(
        mockSheetErrors.authError
      );

      const request = createTestRequest({
        url: 'http://localhost:3000/api/attendees',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
      });

      await GET(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch attendees:',
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Google Sheets integration', () => {
    it('should call Google Sheets API with correct spreadsheet ID', async () => {
      const request = createTestRequest({
        url: 'http://localhost:3000/api/attendees',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
      });

      await GET(request);

      expect(mockSheetsClient.spreadsheets.values.get).toHaveBeenCalledWith(
        expect.objectContaining({
          spreadsheetId: 'test-spreadsheet-id-12345',
        })
      );
    });

    it('should use correct sheet range from config', async () => {
      const request = createTestRequest({
        url: 'http://localhost:3000/api/attendees',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
      });

      await GET(request);

      expect(mockSheetsClient.spreadsheets.values.get).toHaveBeenCalledWith(
        expect.objectContaining({
          range: 'シート1!A2:ZZ',
        })
      );
    });
  });
});
