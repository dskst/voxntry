import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-min-32-chars-long';
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.com';
process.env.GOOGLE_PRIVATE_KEY = 'test-private-key';
process.env.GOOGLE_SHEET_ID = 'test-sheet-id';
process.env.ADMIN_PASSWORD_HASH = '$2b$10$test-hash';

// Mock Next.js headers and cookies
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn(),
    has: vi.fn(),
    forEach: vi.fn(),
  })),
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
    getAll: vi.fn(() => []),
  })),
}));

// Global test utilities are available through process.env
