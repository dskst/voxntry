import { describe, it, expect, vi } from 'vitest';
import {
  loadConferences,
  getConferences,
  getConference,
  validateEnvVar,
  type FileSystem,
  type Environment,
} from './config-loader';

describe('config-loader', () => {
  describe('validateEnvVar', () => {
    it('should return value when defined', () => {
      const result = validateEnvVar('TEST_VAR', 'test-value');

      expect(result).toBe('test-value');
    });

    it('should throw error when value is undefined', () => {
      expect(() => validateEnvVar('TEST_VAR', undefined)).toThrow(
        'Missing required environment variable: TEST_VAR'
      );
    });

    it('should throw error when value is empty string', () => {
      expect(() => validateEnvVar('TEST_VAR', '')).toThrow(
        'Missing required environment variable: TEST_VAR'
      );
    });
  });

  describe('loadConferences', () => {
    const mockValidConfig = {
      conferences: [
        {
          id: 'conf-001',
          name: 'Test Conference',
          passwordEnvVar: 'CONF_001_PASSWORD',
          spreadsheetId: 'test-sheet-id-123',
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
            },
          },
        },
      ],
    };

    it('should load and enrich conferences with environment variables', () => {
      const mockFS: FileSystem = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => JSON.stringify(mockValidConfig)),
      };

      const mockEnv: Environment = {
        CONF_001_PASSWORD: 'test-password-123',
      };

      const result = loadConferences(mockFS, mockEnv, '/test/cwd');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'conf-001',
        name: 'Test Conference',
        password: 'test-password-123',
        spreadsheetId: 'test-sheet-id-123',
      });
    });

    it('should throw error when config file does not exist', () => {
      const mockFS: FileSystem = {
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(),
      };

      const mockEnv: Environment = {};

      expect(() => loadConferences(mockFS, mockEnv, '/test/cwd')).toThrow(
        'Conference configuration file not found'
      );
    });

    it('should throw error when JSON is invalid', () => {
      const mockFS: FileSystem = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => '{invalid json'),
      };

      const mockEnv: Environment = {};

      expect(() => loadConferences(mockFS, mockEnv, '/test/cwd')).toThrow(
        'Invalid JSON in conference configuration file'
      );
    });

    it('should throw error when conferences array is missing', () => {
      const mockFS: FileSystem = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => JSON.stringify({})),
      };

      const mockEnv: Environment = {};

      expect(() => loadConferences(mockFS, mockEnv, '/test/cwd')).toThrow(
        'Invalid configuration file format'
      );
    });

    it('should throw error when password environment variable is missing', () => {
      const mockFS: FileSystem = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => JSON.stringify(mockValidConfig)),
      };

      const mockEnv: Environment = {
        // Missing CONF_001_PASSWORD
      };

      expect(() => loadConferences(mockFS, mockEnv, '/test/cwd')).toThrow(
        'Missing required environment variable: CONF_001_PASSWORD'
      );
    });

    it('should handle multiple conferences', () => {
      const multiConfig = {
        conferences: [
          {
            id: 'conf-001',
            name: 'Conference 1',
            passwordEnvVar: 'CONF_001_PASSWORD',
            spreadsheetId: 'sheet-001',
          },
          {
            id: 'conf-002',
            name: 'Conference 2',
            passwordEnvVar: 'CONF_002_PASSWORD',
            spreadsheetId: 'sheet-002',
          },
        ],
      };

      const mockFS: FileSystem = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => JSON.stringify(multiConfig)),
      };

      const mockEnv: Environment = {
        CONF_001_PASSWORD: 'password1',
        CONF_002_PASSWORD: 'password2',
      };

      const result = loadConferences(mockFS, mockEnv, '/test/cwd');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('conf-001');
      expect(result[0].password).toBe('password1');
      expect(result[1].id).toBe('conf-002');
      expect(result[1].password).toBe('password2');
    });

    it('should validate conference configuration with Zod', () => {
      const invalidConfig = {
        conferences: [
          {
            id: 'Invalid ID!', // Contains invalid characters
            name: 'Test Conference',
            passwordEnvVar: 'invalid-var', // Must be uppercase
            spreadsheetId: 'sheet-id',
          },
        ],
      };

      const mockFS: FileSystem = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => JSON.stringify(invalidConfig)),
      };

      const mockEnv: Environment = {
        'invalid-var': 'password',
      };

      expect(() => loadConferences(mockFS, mockEnv, '/test/cwd')).toThrow();
    });

    it('should reject duplicate conference IDs', () => {
      const duplicateConfig = {
        conferences: [
          {
            id: 'conf-001',
            name: 'Conference 1',
            passwordEnvVar: 'CONF_001_PASSWORD',
            spreadsheetId: 'sheet-001',
          },
          {
            id: 'conf-001', // Duplicate ID
            name: 'Conference 2',
            passwordEnvVar: 'CONF_002_PASSWORD',
            spreadsheetId: 'sheet-002',
          },
        ],
      };

      const mockFS: FileSystem = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => JSON.stringify(duplicateConfig)),
      };

      const mockEnv: Environment = {
        CONF_001_PASSWORD: 'password1',
        CONF_002_PASSWORD: 'password2',
      };

      expect(() => loadConferences(mockFS, mockEnv, '/test/cwd')).toThrow(
        'Duplicate conference IDs found'
      );
    });

    it('should handle optional sheetConfig', () => {
      const configWithoutSheetConfig = {
        conferences: [
          {
            id: 'conf-001',
            name: 'Test Conference',
            passwordEnvVar: 'CONF_001_PASSWORD',
            spreadsheetId: 'sheet-001',
            // No sheetConfig
          },
        ],
      };

      const mockFS: FileSystem = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => JSON.stringify(configWithoutSheetConfig)),
      };

      const mockEnv: Environment = {
        CONF_001_PASSWORD: 'password1',
      };

      const result = loadConferences(mockFS, mockEnv, '/test/cwd');

      expect(result).toHaveLength(1);
      expect(result[0].sheetConfig).toBeUndefined();
    });
  });

  describe('getConference', () => {
    const mockConferences = [
      {
        id: 'conf-001',
        name: 'Conference 1',
        password: 'pass1',
        spreadsheetId: 'sheet-001',
        sheetConfig: undefined,
      },
      {
        id: 'conf-002',
        name: 'Conference 2',
        password: 'pass2',
        spreadsheetId: 'sheet-002',
        sheetConfig: undefined,
      },
    ];

    it('should find conference by ID', () => {
      const result = getConference('conf-001', mockConferences);

      expect(result).toBeDefined();
      expect(result?.id).toBe('conf-001');
      expect(result?.name).toBe('Conference 1');
    });

    it('should return undefined for non-existent ID', () => {
      const result = getConference('conf-999', mockConferences);

      expect(result).toBeUndefined();
    });

    it('should handle empty conferences array', () => {
      const result = getConference('conf-001', []);

      expect(result).toBeUndefined();
    });
  });

  describe('getConferences', () => {
    it('should cache conferences in production', () => {
      const mockConfig = {
        conferences: [
          {
            id: 'conf-001',
            name: 'Test',
            passwordEnvVar: 'PASSWORD',
            spreadsheetId: 'sheet',
          },
        ],
      };

      let readCount = 0;
      const mockFS: FileSystem = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => {
          readCount++;
          return JSON.stringify(mockConfig);
        }),
      };

      const mockEnv: Environment = {
        NODE_ENV: 'production',
        PASSWORD: 'test-pass',
      };

      // First call
      const result1 = getConferences(mockFS, mockEnv, '/test/cwd');
      expect(readCount).toBe(1);

      // Second call - should use cache
      const result2 = getConferences(mockFS, mockEnv, '/test/cwd');
      expect(readCount).toBe(1); // Should not read again

      expect(result1).toEqual(result2);
    });

    it('should not cache in development', () => {
      const mockConfig = {
        conferences: [
          {
            id: 'conf-001',
            name: 'Test',
            passwordEnvVar: 'PASSWORD',
            spreadsheetId: 'sheet',
          },
        ],
      };

      let readCount = 0;
      const mockFS: FileSystem = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => {
          readCount++;
          return JSON.stringify(mockConfig);
        }),
      };

      const mockEnv: Environment = {
        NODE_ENV: 'development',
        PASSWORD: 'test-pass',
      };

      // First call
      getConferences(mockFS, mockEnv, '/test/cwd');
      expect(readCount).toBe(1);

      // Second call - should read again
      getConferences(mockFS, mockEnv, '/test/cwd');
      expect(readCount).toBe(2);
    });
  });
});
