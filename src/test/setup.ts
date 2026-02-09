import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for jose library in jsdom environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-min-32-chars-long';
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.com';
process.env.GOOGLE_PRIVATE_KEY = 'test-private-key';
process.env.GOOGLE_SHEET_ID = 'test-sheet-id';
process.env.ADMIN_PASSWORD_HASH = '$2b$10$test-hash';

// Global test utilities are available through process.env
// Note: Next.js mocks (headers, cookies) should be added per-test in individual test files
// to allow for test-specific behavior customization
