import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should have environment variables configured', () => {
    expect(process.env.JWT_SECRET).toBe('test-jwt-secret-key-min-32-chars-long');
    expect(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL).toBe('test@example.com');
    expect(process.env.GOOGLE_SHEET_ID).toBe('test-sheet-id');
  });

  it('should have test environment accessible through process.env', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET).toBe('test-jwt-secret-key-min-32-chars-long');
  });
});
