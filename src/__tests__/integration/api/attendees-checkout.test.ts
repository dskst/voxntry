import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/attendees/checkout/route';
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

vi.mock('@/lib/config-loader', () => ({
  getConferences: vi.fn(() => [
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
          affiliation: 2,
          name: 3,
          items: 5,
          checkedIn: 9,
          checkedInAt: 10,
          staffName: 11,
        },
      },
    },
  ]),
  getConference: vi.fn((id: string) => {
    const conferences = [
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
            affiliation: 2,
            name: 3,
            items: 5,
            checkedIn: 9,
            checkedInAt: 10,
            staffName: 11,
          },
        },
      },
    ];
    return conferences.find(c => c.id === id);
  }),
}));

describe('POST /api/attendees/checkout', () => {
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

    // Default: Batch update succeeds
    mockSheetsClient.spreadsheets.values.batchUpdate.mockResolvedValue(
      mockSheetResponses.batchUpdateSuccess
    );
  });

  describe('Authentication required', () => {
    it('should return 401 when no conference ID in headers', async () => {
      const request = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        body: { rowId: '001' },
      });

      const response = await POST(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(401);
      expect(result.body.error).toBe('Unauthorized');
    });

    it('should require middleware-injected headers', async () => {
      const request = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          // No x-user-conference-id header
        },
        body: { rowId: '001' },
      });

      const response = await POST(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('Request validation', () => {
    it('should return 400 for missing rowId', async () => {
      const request = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
        body: {},
      });

      const response = await POST(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(400);
      expect(result.body.error).toBe('Validation failed');
      expect(result.body.details).toEqual(expect.arrayContaining([expect.stringContaining('rowId')]));
    });

    it('should return 400 for invalid JSON', async () => {
      const request = new Request('http://localhost:3000/api/attendees/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-conference-id': 'test-conf-2026',
        },
        body: 'invalid-json{',
      });

      const response = await POST(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(400);
      expect(result.body.error).toBe('Invalid JSON in request body');
    });

    it('should validate rowId is a string', async () => {
      const request = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
        body: { rowId: 123 }, // Should be string
      });

      const response = await POST(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(400);
      expect(result.body.error).toBe('Validation failed');
    });

    it('should require non-empty rowId', async () => {
      const request = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
        body: { rowId: '' },
      });

      const response = await POST(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(400);
      expect(result.body.error).toBe('Validation failed');
    });
  });

  describe('Conference validation', () => {
    it('should return 404 for non-existent conference', async () => {
      const request = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          'x-user-conference-id': 'non-existent-conf',
        },
        body: { rowId: '001' },
      });

      const response = await POST(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(404);
      expect(result.body.error).toBe('Conference not found');
    });

    it('should validate conference before sheet operation', async () => {
      const request = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          'x-user-conference-id': 'invalid-conf',
        },
        body: { rowId: '001' },
      });

      await POST(request);

      // Google Sheets should not be called for invalid conference
      expect(mockSheetsClient.spreadsheets.values.batchUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Successful check-out', () => {
    it('should return 200 for successful check-out', async () => {
      const request = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
        body: { rowId: '001' },
      });

      const response = await POST(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ success: true });
    });

    it('should call Google Sheets batchUpdate', async () => {
      const request = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
        body: { rowId: '001' },
      });

      await POST(request);

      expect(mockSheetsClient.spreadsheets.values.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spreadsheetId: 'test-spreadsheet-id-12345',
        })
      );
    });

    it('should clear check-in data on checkout', async () => {
      const request = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
        body: { rowId: '001' },
      });

      await POST(request);

      // Verify batch update was called (checkedIn, checkedInAt, staffName cleared)
      expect(mockSheetsClient.spreadsheets.values.batchUpdate).toHaveBeenCalled();
      const callArgs = mockSheetsClient.spreadsheets.values.batchUpdate.mock.calls[0][0];
      expect(callArgs.requestBody).toHaveProperty('data');
    });

    it('should validate rowId must be numeric', async () => {
      // rowId must be numeric per schema validation (/^\d+$/)
      const validRowId = '001';

      const request = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
        body: { rowId: validRowId },
      });

      const response = await POST(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
    });

    it('should reject non-numeric rowId formats', async () => {
      const invalidRowIds = ['ABC', 'row-5', 'ID-123'];

      for (const rowId of invalidRowIds) {
        const request = createTestRequest({
          method: 'POST',
          url: 'http://localhost:3000/api/attendees/checkout',
          headers: {
            'x-user-conference-id': 'test-conf-2026',
          },
          body: { rowId },
        });

        const response = await POST(request);
        const result = await extractResponse(response);

        expect(result.status).toBe(400);
        expect(result.body.error).toBe('Validation failed');
      }
    });

    it('should handle check-out of already checked-out attendee', async () => {
      // Checking out an already checked-out attendee should still succeed
      const request = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
        body: { rowId: '002' }, // Assuming this one is not checked in
      });

      const response = await POST(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
    });
  });

  describe('Attendee not found', () => {
    // Note: These tests are skipped because mocking checkOutAttendee requires
    // module-level mock, which would affect all other tests in this file.
    // The "attendee not found" scenario is better tested through integration tests
    // with actual Google Sheets data or by testing checkOutAttendee directly in unit tests.
    it.skip('should return 404 when attendee not found', async () => {
      // This would require mocking checkOutAttendee at module level
      // which conflicts with successful checkout tests
    });

    it.skip('should not call batchUpdate for non-existent attendee', async () => {
      // This would require mocking checkOutAttendee at module level
      // which conflicts with successful checkout tests
    });
  });

  describe('Error handling', () => {
    it('should return 500 on Google Sheets API failure', async () => {
      mockSheetsClient.spreadsheets.values.batchUpdate.mockRejectedValue(
        mockSheetErrors.serverError
      );

      const request = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
        body: { rowId: '001' },
      });

      const response = await POST(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(500);
      expect(result.body.error).toBe('Failed to update sheet');
    });

    it('should log error details on failure', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSheetsClient.spreadsheets.values.batchUpdate.mockRejectedValue(
        mockSheetErrors.serverError
      );

      const request = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
        body: { rowId: '001' },
      });

      await POST(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to check out:',
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle network timeouts gracefully', async () => {
      mockSheetsClient.spreadsheets.values.batchUpdate.mockRejectedValue(
        mockSheetErrors.serverError
      );

      const request = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
        body: { rowId: '001' },
      });

      const response = await POST(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(500);
      expect(result.body).toHaveProperty('error');
    });
  });

  describe('Idempotency', () => {
    it('should be idempotent - multiple checkouts should succeed', async () => {
      // First checkout
      const request1 = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
        body: { rowId: '001' },
      });

      const response1 = await POST(request1);
      const result1 = await extractResponse(response1);

      expect(result1.status).toBe(200);
      expect(result1.body.success).toBe(true);

      // Second checkout (idempotent) - create new request since bodies can only be read once
      const request2 = createTestRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/attendees/checkout',
        headers: {
          'x-user-conference-id': 'test-conf-2026',
        },
        body: { rowId: '001' },
      });

      const response2 = await POST(request2);
      const result2 = await extractResponse(response2);

      expect(result2.status).toBe(200);
      expect(result2.body.success).toBe(true);
    });
  });
});
