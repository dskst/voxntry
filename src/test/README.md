# Test Framework Setup

This directory contains test configuration, utilities, and helpers for the VOXNTRY project.

## Framework

We use **Vitest** as the test framework with the following key features:

- Fast test execution with native ESM support
- Compatible with Next.js 16 and TypeScript 5
- Jest-compatible API for easy migration if needed
- Built-in coverage reporting with v8
- UI mode for interactive test debugging

## Directory Structure

```
src/test/
├── setup.ts              # Global test setup and mocks
├── helpers/              # Test helper utilities
│   ├── jwt-helper.ts     # JWT token generation helpers
│   ├── request-helper.ts # HTTP request/response mocking
│   └── google-sheets-helper.ts # Google Sheets API mocking
└── README.md             # This file
```

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm test:run

# Run tests with UI
npm test:ui

# Run tests with coverage
npm test:coverage
```

## Configuration

- **vitest.config.ts**: Main Vitest configuration
- **src/test/setup.ts**: Global setup file that runs before all tests

## Test Helpers

### JWT Helper

```typescript
import { generateTestToken, generateExpiredTestToken } from '@/test/helpers';

const token = await generateTestToken({ username: 'admin' });
const expiredToken = await generateExpiredTestToken();
```

### Request Helper

```typescript
import { createMockRequest, mockCookies, mockHeaders } from '@/test/helpers';

const request = createMockRequest({
  method: 'POST',
  body: { username: 'admin', password: 'test' },
  cookies: { token: 'jwt-token' }
});

const cookies = mockCookies({ token: 'jwt-token' });
const headers = mockHeaders({ 'x-csrf-token': 'csrf-token' });
```

### Google Sheets Helper

```typescript
import {
  createMockGoogleSheetsClient,
  createMockAttendee,
  mockAttendeeData
} from '@/test/helpers';

const sheetsClient = createMockGoogleSheetsClient();
const attendee = createMockAttendee({ name: 'John Doe' });
```

## Writing Tests

Test files should be placed alongside the code they test with the `.test.ts` or `.spec.ts` extension:

```
src/
├── lib/
│   ├── jwt.ts
│   └── jwt.test.ts
└── app/
    └── api/
        └── auth/
            └── login/
                ├── route.ts
                └── route.test.ts
```

## Environment Variables

Test environment variables are configured in `setup.ts`:

- `JWT_SECRET`: Test JWT secret key
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Test Google service account
- `GOOGLE_PRIVATE_KEY`: Test Google private key
- `GOOGLE_SHEET_ID`: Test Google Sheet ID
- `ADMIN_PASSWORD_HASH`: Test admin password hash

## Mocking

### Next.js Mocks

Next.js modules like `next/headers` are automatically mocked in `setup.ts`:

```typescript
import { headers, cookies } from 'next/headers';
// These are automatically mocked in tests
```

### External Dependencies

For external dependencies like Google Sheets API, use the provided helpers or create custom mocks:

```typescript
import { vi } from 'vitest';

vi.mock('googleapis', () => ({
  google: {
    sheets: vi.fn(() => createMockGoogleSheetsClient())
  }
}));
```

## Coverage

Coverage reports are generated in the `coverage/` directory and include:

- Text summary in the console
- HTML report in `coverage/index.html`
- JSON report for CI integration

Target coverage thresholds:

- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%
