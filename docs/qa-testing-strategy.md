# QA Testing Strategy for ConferenceConfig Externalization

## Executive Summary

This document outlines a comprehensive testing strategy for externalizing ConferenceConfig, ensuring configuration reliability, early error detection, and maintainability.

## 1. Schema Validation Strategy

### 1.1 Zod Runtime Validation

**Rationale**: Catch configuration errors at load time before they cause runtime failures.

**Implementation Approach**:

```typescript
// src/schemas/conference-config.ts
import { z } from 'zod';

/**
 * Column mapping schema with strict validation
 */
const SheetColumnMappingSchema = z.object({
  sheetName: z.string().min(1, 'Sheet name is required'),
  startRow: z.number().int().positive('Start row must be a positive integer'),
  columns: z.object({
    // Required columns
    id: z.number().int().nonnegative(),
    affiliation: z.number().int().nonnegative(),
    name: z.number().int().nonnegative(),
    items: z.number().int().nonnegative(),
    checkedIn: z.number().int().nonnegative(),
    checkedInAt: z.number().int().nonnegative(),
    staffName: z.number().int().nonnegative(),

    // Optional columns
    attribute: z.number().int().nonnegative().optional(),
    nameKana: z.number().int().nonnegative().optional(),
    bodySize: z.number().int().nonnegative().optional(),
    novelties: z.number().int().nonnegative().optional(),
    memo: z.number().int().nonnegative().optional(),
    attendsReception: z.number().int().nonnegative().optional(),
  }).strict(), // Prevent extra properties
});

/**
 * Conference config schema with comprehensive validation
 */
export const ConferenceConfigSchema = z.object({
  id: z.string()
    .min(1, 'Conference ID is required')
    .max(100, 'Conference ID must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Conference ID must contain only lowercase letters, numbers, and hyphens'),

  name: z.string()
    .min(1, 'Conference name is required')
    .max(200, 'Conference name must be less than 200 characters'),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(200, 'Password must be less than 200 characters'),

  spreadsheetId: z.string()
    .min(1, 'Spreadsheet ID is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid spreadsheet ID format'),

  sheetConfig: SheetColumnMappingSchema.optional(),
}).strict();

/**
 * Array of conference configs
 */
export const ConferenceConfigArraySchema = z.array(ConferenceConfigSchema)
  .min(1, 'At least one conference configuration is required')
  .refine(
    (configs) => {
      const ids = configs.map(c => c.id);
      return ids.length === new Set(ids).size;
    },
    { message: 'Duplicate conference IDs found' }
  );

export type ValidatedConferenceConfig = z.infer<typeof ConferenceConfigSchema>;
```

### 1.2 Validation Points

1. **Load-time validation**: Validate config when loading from external source
2. **Build-time validation**: Optional CI check for config files
3. **Runtime validation**: Re-validate when config is hot-reloaded

## 2. Error Handling Strategy

### 2.1 Configuration Loader with Error Context

```typescript
// src/lib/config-loader.ts
import { ConferenceConfigArraySchema } from '@/schemas/conference-config';

export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export async function loadConferenceConfig(source: string): Promise<ValidatedConferenceConfig[]> {
  try {
    // Load config from source (JSON file, GCS, Firestore, etc.)
    const rawConfig = await loadFromSource(source);

    // Validate with Zod
    const result = ConferenceConfigArraySchema.safeParse(rawConfig);

    if (!result.success) {
      // Format validation errors for better debugging
      const errors = result.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      throw new ConfigurationError(
        'Configuration validation failed',
        { errors, source }
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }

    // Wrap other errors with context
    throw new ConfigurationError(
      `Failed to load configuration from ${source}: ${error.message}`,
      { source, originalError: error }
    );
  }
}
```

### 2.2 Graceful Degradation

```typescript
// src/config/conferences.ts
import { loadConferenceConfig } from '@/lib/config-loader';

let cachedConfig: ValidatedConferenceConfig[] | null = null;

export async function getConferences(): Promise<ValidatedConferenceConfig[]> {
  // Try to load from external source
  try {
    const config = await loadConferenceConfig(process.env.CONFIG_SOURCE || 'local');
    cachedConfig = config;
    return config;
  } catch (error) {
    console.error('Failed to load conference config:', error);

    // Fallback to cached config if available
    if (cachedConfig) {
      console.warn('Using cached conference configuration');
      return cachedConfig;
    }

    // Last resort: throw error (fail-fast)
    throw new ConfigurationError(
      'No valid configuration available',
      { error: error.message }
    );
  }
}
```

## 3. Test Data Management

### 3.1 Test Configuration Files

**Structure**:
```
tests/
  fixtures/
    configs/
      valid-minimal.json          # Minimal valid config
      valid-full.json             # Full config with all optional fields
      invalid-missing-id.json     # Missing required field
      invalid-duplicate-id.json   # Duplicate conference IDs
      invalid-column-index.json   # Negative column index
      invalid-spreadsheet-id.json # Invalid spreadsheet ID format
      edge-empty-array.json       # Empty conference array
      edge-special-chars.json     # Special characters in fields
```

**Example Test Fixtures**:

```json
// tests/fixtures/configs/valid-minimal.json
[
  {
    "id": "test-conf-2025",
    "name": "Test Conference 2025",
    "password": "test-password-123",
    "spreadsheetId": "test-spreadsheet-id-123"
  }
]
```

```json
// tests/fixtures/configs/invalid-missing-id.json
[
  {
    "name": "Test Conference 2025",
    "password": "test-password-123",
    "spreadsheetId": "test-spreadsheet-id-123"
  }
]
```

### 3.2 Test Environment Variables

```bash
# .env.test
CONFIG_SOURCE=test-fixtures
CONFERENCE_TEST_PASSWORD=test-password-123
NEXT_PUBLIC_TEST_SPREADSHEET_ID=test-spreadsheet-id
```

## 4. CI/CD Integration

### 4.1 Configuration Validation in CI

```yaml
# .github/workflows/config-validation.yml
name: Configuration Validation

on:
  pull_request:
    paths:
      - 'config/**'
      - 'src/schemas/conference-config.ts'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Validate configuration schemas
        run: npm run test:config-validation

      - name: Validate production configs
        run: npm run validate:config -- config/production
```

### 4.2 Pre-deployment Checks

```typescript
// scripts/validate-config.ts
import { loadConferenceConfig } from '@/lib/config-loader';

async function validateConfig(source: string) {
  try {
    const configs = await loadConferenceConfig(source);
    console.log(`✓ Successfully validated ${configs.length} conference(s)`);

    // Additional checks
    for (const config of configs) {
      console.log(`  - ${config.id}: ${config.name}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Configuration validation failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run validation
validateConfig(process.argv[2] || 'production').catch(console.error);
```

## 5. Unit Testing Strategy

### 5.1 Schema Validation Tests

```typescript
// tests/unit/schemas/conference-config.test.ts
import { describe, it, expect } from 'vitest';
import { ConferenceConfigSchema, ConferenceConfigArraySchema } from '@/schemas/conference-config';

describe('ConferenceConfigSchema', () => {
  describe('Valid configurations', () => {
    it('should accept minimal valid config', () => {
      const config = {
        id: 'test-conf',
        name: 'Test Conference',
        password: 'password123',
        spreadsheetId: 'abc123def456',
      };

      const result = ConferenceConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should accept config with full sheet mapping', () => {
      const config = {
        id: 'test-conf',
        name: 'Test Conference',
        password: 'password123',
        spreadsheetId: 'abc123def456',
        sheetConfig: {
          sheetName: 'Sheet1',
          startRow: 2,
          columns: {
            id: 0,
            affiliation: 1,
            name: 2,
            items: 3,
            checkedIn: 4,
            checkedInAt: 5,
            staffName: 6,
            attribute: 7,
          },
        },
      };

      const result = ConferenceConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid configurations', () => {
    it('should reject config with missing required fields', () => {
      const config = {
        id: 'test-conf',
        name: 'Test Conference',
        // Missing password and spreadsheetId
      };

      const result = ConferenceConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
      expect(result.error?.errors).toContainEqual(
        expect.objectContaining({ path: ['password'] })
      );
    });

    it('should reject config with invalid ID format', () => {
      const config = {
        id: 'TestConf_2025!',  // Invalid: uppercase, underscore, special char
        name: 'Test Conference',
        password: 'password123',
        spreadsheetId: 'abc123def456',
      };

      const result = ConferenceConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject config with negative column index', () => {
      const config = {
        id: 'test-conf',
        name: 'Test Conference',
        password: 'password123',
        spreadsheetId: 'abc123def456',
        sheetConfig: {
          sheetName: 'Sheet1',
          startRow: 2,
          columns: {
            id: -1,  // Invalid: negative
            affiliation: 1,
            name: 2,
            items: 3,
            checkedIn: 4,
            checkedInAt: 5,
            staffName: 6,
          },
        },
      };

      const result = ConferenceConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('Array validation', () => {
    it('should reject empty array', () => {
      const result = ConferenceConfigArraySchema.safeParse([]);
      expect(result.success).toBe(false);
    });

    it('should reject duplicate conference IDs', () => {
      const configs = [
        {
          id: 'test-conf',
          name: 'Test Conference 1',
          password: 'password123',
          spreadsheetId: 'abc123',
        },
        {
          id: 'test-conf',  // Duplicate ID
          name: 'Test Conference 2',
          password: 'password456',
          spreadsheetId: 'def456',
        },
      ];

      const result = ConferenceConfigArraySchema.safeParse(configs);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Duplicate conference IDs');
    });
  });
});
```

### 5.2 Config Loader Tests

```typescript
// tests/unit/lib/config-loader.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadConferenceConfig, ConfigurationError } from '@/lib/config-loader';

describe('loadConferenceConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load and validate valid configuration', async () => {
    const configs = await loadConferenceConfig('tests/fixtures/configs/valid-minimal.json');

    expect(configs).toHaveLength(1);
    expect(configs[0].id).toBe('test-conf-2025');
  });

  it('should throw ConfigurationError for invalid config', async () => {
    await expect(
      loadConferenceConfig('tests/fixtures/configs/invalid-missing-id.json')
    ).rejects.toThrow(ConfigurationError);
  });

  it('should provide detailed error context', async () => {
    try {
      await loadConferenceConfig('tests/fixtures/configs/invalid-missing-id.json');
      fail('Should have thrown error');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.context).toBeDefined();
      expect(error.context.errors).toBeDefined();
    }
  });

  it('should handle file not found gracefully', async () => {
    await expect(
      loadConferenceConfig('nonexistent.json')
    ).rejects.toThrow(ConfigurationError);
  });
});
```

### 5.3 Sheet Mapping Tests

```typescript
// tests/unit/lib/google-sheets.test.ts
import { describe, it, expect } from 'vitest';
import { mapRowToAttendee } from '@/lib/google-sheets';

describe('mapRowToAttendee', () => {
  it('should map row with custom column configuration', () => {
    const row = ['ID001', 'Speaker', 'Acme Corp', 'John Doe', 'ジョン', 'Badge,Swag'];
    const config = {
      sheetName: 'Sheet1',
      startRow: 2,
      columns: {
        id: 0,
        attribute: 1,
        affiliation: 2,
        name: 3,
        nameKana: 4,
        items: 5,
        checkedIn: 6,
        checkedInAt: 7,
        staffName: 8,
      },
    };

    const attendee = mapRowToAttendee(row, 0, config);

    expect(attendee.id).toBe('ID001');
    expect(attendee.attribute).toBe('Speaker');
    expect(attendee.affiliation).toBe('Acme Corp');
    expect(attendee.name).toBe('John Doe');
    expect(attendee.nameKana).toBe('ジョン');
    expect(attendee.items).toEqual(['Badge', 'Swag']);
  });

  it('should handle missing optional columns', () => {
    const row = ['ID001', 'Acme Corp', 'John Doe', 'Badge', 'FALSE'];
    const config = {
      sheetName: 'Sheet1',
      startRow: 2,
      columns: {
        id: 0,
        affiliation: 1,
        name: 2,
        items: 3,
        checkedIn: 4,
        checkedInAt: 5,
        staffName: 6,
      },
    };

    const attendee = mapRowToAttendee(row, 0, config);

    expect(attendee.attribute).toBeUndefined();
    expect(attendee.nameKana).toBeUndefined();
    expect(attendee.bodySize).toBeUndefined();
  });
});
```

## 6. Integration Testing Strategy

### 6.1 End-to-End Config Loading

```typescript
// tests/integration/config-loading.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { getConferences } from '@/config/conferences';

describe('Conference Configuration Loading', () => {
  beforeAll(() => {
    // Set test environment
    process.env.CONFIG_SOURCE = 'test-fixtures';
  });

  it('should load conferences from configured source', async () => {
    const conferences = await getConferences();

    expect(conferences).toBeDefined();
    expect(conferences.length).toBeGreaterThan(0);
  });

  it('should provide conference lookup by ID', async () => {
    const conferences = await getConferences();
    const testConf = conferences.find(c => c.id === 'test-conf-2025');

    expect(testConf).toBeDefined();
    expect(testConf?.name).toBe('Test Conference 2025');
  });
});
```

### 6.2 API Route Integration Tests

```typescript
// tests/integration/api/auth-login.test.ts
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/auth/login/route';

describe('POST /api/auth/login', () => {
  it('should authenticate with valid conference credentials', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conferenceId: 'test-conf-2025',
        password: 'test-password-123',
        staffName: 'Test Staff',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should reject invalid conference ID', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conferenceId: 'nonexistent-conf',
        password: 'test-password-123',
        staffName: 'Test Staff',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});
```

## 7. Test Case Catalog

### 7.1 Positive Test Cases

| Test ID | Category | Description | Expected Result |
|---------|----------|-------------|-----------------|
| POS-001 | Schema | Minimal valid config | Validation passes |
| POS-002 | Schema | Full config with all optional fields | Validation passes |
| POS-003 | Loader | Load from JSON file | Config loaded successfully |
| POS-004 | Loader | Load from GCS | Config loaded successfully |
| POS-005 | Loader | Load from Firestore | Config loaded successfully |
| POS-006 | API | Login with valid credentials | 200 OK |
| POS-007 | API | Fetch attendees with valid config | Attendees returned |

### 7.2 Negative Test Cases

| Test ID | Category | Description | Expected Result |
|---------|----------|-------------|-----------------|
| NEG-001 | Schema | Missing required field (id) | Validation error with clear message |
| NEG-002 | Schema | Missing required field (password) | Validation error with clear message |
| NEG-003 | Schema | Invalid ID format (uppercase) | Validation error |
| NEG-004 | Schema | Invalid ID format (special chars) | Validation error |
| NEG-005 | Schema | Negative column index | Validation error |
| NEG-006 | Schema | Duplicate conference IDs | Validation error |
| NEG-007 | Schema | Empty conference array | Validation error |
| NEG-008 | Loader | Malformed JSON | ConfigurationError with context |
| NEG-009 | Loader | File not found | ConfigurationError with context |
| NEG-010 | Loader | Network timeout (GCS) | ConfigurationError with retry info |
| NEG-011 | API | Login with invalid conference ID | 401 Unauthorized |
| NEG-012 | API | Login with wrong password | 401 Unauthorized |

### 7.3 Edge Cases

| Test ID | Category | Description | Expected Result |
|---------|----------|-------------|-----------------|
| EDGE-001 | Schema | Minimum length strings | Validation passes |
| EDGE-002 | Schema | Maximum length strings | Validation passes |
| EDGE-003 | Schema | Special characters in name | Validation passes |
| EDGE-004 | Schema | Unicode characters (Japanese) | Validation passes |
| EDGE-005 | Schema | Very large column indices (>100) | Validation passes |
| EDGE-006 | Loader | Large config file (>100 conferences) | Loads within acceptable time |
| EDGE-007 | Loader | Concurrent config loads | No race conditions |
| EDGE-008 | Cache | Stale cache handling | Fresh config loaded |

## 8. Test Implementation Guidelines

### 8.1 Testing Framework Setup

**Recommended Stack**:
- **Test Runner**: Vitest (fast, TypeScript-native)
- **Assertions**: Vitest built-in (Chai-compatible)
- **Mocking**: Vitest mocking utilities
- **Coverage**: v8 coverage (built into Vitest)

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:coverage": "vitest run --coverage",
    "test:config-validation": "vitest run tests/validation"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0"
  }
}
```

### 8.2 Test Organization

```
tests/
├── unit/
│   ├── schemas/
│   │   └── conference-config.test.ts
│   ├── lib/
│   │   ├── config-loader.test.ts
│   │   └── google-sheets.test.ts
│   └── utils/
│       └── validation.test.ts
├── integration/
│   ├── api/
│   │   ├── auth-login.test.ts
│   │   ├── attendees.test.ts
│   │   └── checkin.test.ts
│   └── config-loading.test.ts
├── fixtures/
│   └── configs/
│       ├── valid-*.json
│       └── invalid-*.json
└── validation/
    └── schema-validation.test.ts
```

### 8.3 Coverage Goals

**Minimum Coverage Targets**:
- **Schemas**: 100% (critical for validation)
- **Config Loader**: 95% (core functionality)
- **Google Sheets Mapping**: 90% (data transformation)
- **API Routes**: 85% (business logic)
- **Overall Project**: 80%

### 8.4 Continuous Testing

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
```

## 9. Error Message Guidelines

### 9.1 User-Facing Error Messages

**Principles**:
1. **Clear and actionable**: Tell users what went wrong and how to fix it
2. **Contextual**: Include relevant details (field name, expected format)
3. **No technical jargon**: Avoid internal error codes or stack traces

**Examples**:

```typescript
// Good
"Conference ID 'TestConf_2025!' is invalid. Use only lowercase letters, numbers, and hyphens."

// Bad
"Validation error: regex match failed"
```

### 9.2 Developer Error Messages

**Principles**:
1. **Detailed context**: Include all relevant debugging information
2. **Structured data**: Use error context objects, not just strings
3. **Actionable suggestions**: Hint at possible solutions

**Example**:

```typescript
throw new ConfigurationError(
  'Failed to load conference configuration',
  {
    source: 'gs://my-bucket/config.json',
    reason: 'Network timeout after 30s',
    suggestion: 'Check GCS bucket permissions and network connectivity',
    errors: [
      { path: 'conferences[0].id', message: 'Required field missing' },
      { path: 'conferences[1].password', message: 'Must be at least 8 characters' },
    ],
  }
);
```

## 10. Monitoring and Alerting

### 10.1 Configuration Health Checks

```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    const configs = await getConferences();

    return Response.json({
      status: 'healthy',
      configCount: configs.length,
      lastValidated: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
```

### 10.2 Error Rate Monitoring

**Metrics to Track**:
- Configuration load failures per hour
- Validation error rate
- Cache hit/miss ratio
- Average config load time

**Alerting Thresholds**:
- Alert if config load fails 3 times consecutively
- Alert if validation error rate >5% of requests
- Alert if config load time >5 seconds

## 11. Migration Testing Strategy

### 11.1 Backward Compatibility Tests

Ensure existing code works with externalized config:

```typescript
// tests/migration/backward-compatibility.test.ts
import { describe, it, expect } from 'vitest';
import { getConference } from '@/config/conferences';

describe('Backward Compatibility', () => {
  it('should maintain getConference() API', async () => {
    const conference = await getConference('demo-conf');

    expect(conference).toBeDefined();
    expect(conference?.id).toBe('demo-conf');
    expect(conference?.name).toBe('Demo Conference 2025');
  });

  it('should maintain sheetConfig structure', async () => {
    const conference = await getConference('demo-conf');

    expect(conference?.sheetConfig).toBeDefined();
    expect(conference?.sheetConfig?.columns.id).toBe(0);
  });
});
```

### 11.2 Data Migration Validation

```typescript
// scripts/validate-migration.ts
import { conferences as oldConfig } from './old-config';
import { getConferences as newConfig } from '@/config/conferences';

async function validateMigration() {
  const newConfs = await newConfig();

  console.log('Validating migration...');

  for (const oldConf of oldConfig) {
    const newConf = newConfs.find(c => c.id === oldConf.id);

    if (!newConf) {
      console.error(`✗ Missing conference: ${oldConf.id}`);
      continue;
    }

    // Validate all fields match
    const fieldsMatch =
      newConf.name === oldConf.name &&
      newConf.spreadsheetId === oldConf.spreadsheetId &&
      JSON.stringify(newConf.sheetConfig) === JSON.stringify(oldConf.sheetConfig);

    if (fieldsMatch) {
      console.log(`✓ ${oldConf.id} migrated correctly`);
    } else {
      console.error(`✗ ${oldConf.id} has mismatched data`);
    }
  }
}

validateMigration().catch(console.error);
```

## 12. Performance Testing

### 12.1 Load Time Benchmarks

```typescript
// tests/performance/config-loading.bench.ts
import { bench, describe } from 'vitest';
import { loadConferenceConfig } from '@/lib/config-loader';

describe('Configuration Loading Performance', () => {
  bench('Load config from JSON file', async () => {
    await loadConferenceConfig('tests/fixtures/configs/valid-full.json');
  });

  bench('Load config from GCS', async () => {
    await loadConferenceConfig('gs://my-bucket/config.json');
  });

  bench('Load config from Firestore', async () => {
    await loadConferenceConfig('firestore://conferences');
  });
});
```

**Acceptance Criteria**:
- JSON file load: <100ms
- GCS load (cold): <500ms
- GCS load (cached): <50ms
- Firestore load: <300ms

## 13. Security Testing Considerations

### 13.1 Password Validation

- Never log passwords in error messages
- Validate password strength at config load time
- Ensure bcrypt hashed passwords in production

### 13.2 Configuration Access Control

- Restrict GCS bucket access to service accounts
- Use Firestore security rules to protect configs
- Audit configuration access logs

### 13.3 Sensitive Data Handling

```typescript
// Sanitize config for logging
function sanitizeConfigForLogging(config: ConferenceConfig) {
  return {
    ...config,
    password: '[REDACTED]',
  };
}
```

## 14. Rollback Strategy

### 14.1 Config Version Control

Maintain configuration history to enable rollback:

```typescript
// src/lib/config-loader.ts
export async function loadConferenceConfig(
  source: string,
  version?: string
): Promise<ValidatedConferenceConfig[]> {
  const actualSource = version
    ? `${source}?version=${version}`
    : source;

  // Load and validate...
}
```

### 14.2 Automatic Rollback Trigger

```typescript
// src/lib/config-loader.ts
let consecutiveFailures = 0;
const MAX_FAILURES = 3;

export async function loadConferenceConfig(source: string) {
  try {
    const config = await loadFromSource(source);
    consecutiveFailures = 0; // Reset on success
    return validate(config);
  } catch (error) {
    consecutiveFailures++;

    if (consecutiveFailures >= MAX_FAILURES) {
      console.warn('Multiple config failures, attempting rollback...');
      // Load previous known-good version
      return await loadConferenceConfig(source, 'previous');
    }

    throw error;
  }
}
```

## 15. Testing Checklist

### Pre-Implementation
- [ ] Schema validation design reviewed
- [ ] Test fixtures created for all scenarios
- [ ] Test framework (Vitest) configured
- [ ] CI/CD pipeline updated

### Implementation Phase
- [ ] Unit tests for schemas (100% coverage)
- [ ] Unit tests for config loader (95% coverage)
- [ ] Integration tests for API routes (85% coverage)
- [ ] Performance benchmarks defined
- [ ] Error message standards documented

### Pre-Deployment
- [ ] All tests passing
- [ ] Coverage thresholds met
- [ ] Config validation script runs successfully
- [ ] Migration validation completed
- [ ] Rollback procedure tested

### Post-Deployment
- [ ] Health check endpoint monitored
- [ ] Error rate within acceptable range
- [ ] Config load times within benchmarks
- [ ] No regression in existing functionality

## 16. Conclusion

This testing strategy ensures:
1. **Early error detection** through Zod schema validation
2. **Clear error messages** for developers and operators
3. **Comprehensive test coverage** across unit, integration, and E2E
4. **CI/CD integration** for automated validation
5. **Production monitoring** for config health
6. **Safe migration** with backward compatibility tests
7. **Quick rollback** capability in case of issues

**Key Success Metrics**:
- Zero production incidents due to config errors
- <1% validation failure rate
- <500ms config load time (p95)
- >80% overall test coverage
- 100% schema coverage
