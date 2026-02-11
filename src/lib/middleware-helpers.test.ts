/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  verifyCsrfProtection,
  verifyAuthentication,
  createUserHeaders,
  type RequestHeaders,
  type RequestCookies,
} from './middleware-helpers';
import { generateCsrfToken } from './csrf';
import { signJWT } from './jwt';

describe('middleware-helpers', () => {
  describe('verifyCsrfProtection', () => {
    const validCsrfToken = generateCsrfToken();

    it('should pass for GET requests without CSRF check', async () => {
      const headers: RequestHeaders = {
        get: vi.fn(() => null),
      };

      const cookies: RequestCookies = {
        get: vi.fn(() => undefined),
        getAll: vi.fn(() => []),
      };

      const result = await verifyCsrfProtection('GET', headers, cookies);

      expect(result.success).toBe(true);
    });

    it('should pass for HEAD requests without CSRF check', async () => {
      const headers: RequestHeaders = {
        get: vi.fn(() => null),
      };

      const cookies: RequestCookies = {
        get: vi.fn(() => undefined),
        getAll: vi.fn(() => []),
      };

      const result = await verifyCsrfProtection('HEAD', headers, cookies);

      expect(result.success).toBe(true);
    });

    it('should verify CSRF for POST requests with valid tokens', async () => {
      const headers: RequestHeaders = {
        get: vi.fn((name: string) => {
          if (name === 'origin') return 'https://example.com';
          if (name === 'host') return 'example.com';
          if (name === 'x-csrf-token') return validCsrfToken;
          return null;
        }),
      };

      const cookies: RequestCookies = {
        get: vi.fn((name: string) =>
          name === 'csrf_token' ? { name: 'csrf_token', value: validCsrfToken } : undefined
        ),
        getAll: vi.fn(() => []),
      };

      const result = await verifyCsrfProtection('POST', headers, cookies);

      expect(result.success).toBe(true);
    });

    it('should fail for POST requests with invalid origin', async () => {
      const headers: RequestHeaders = {
        get: vi.fn((name: string) => {
          if (name === 'origin') return 'https://evil.com';
          if (name === 'host') return 'example.com';
          if (name === 'x-csrf-token') return validCsrfToken;
          return null;
        }),
      };

      const cookies: RequestCookies = {
        get: vi.fn((name: string) =>
          name === 'csrf_token' ? { name: 'csrf_token', value: validCsrfToken } : undefined
        ),
        getAll: vi.fn(() => []),
      };

      const result = await verifyCsrfProtection('POST', headers, cookies);

      expect(result.success).toBe(false);
      expect(result.status).toBe(403);
      expect(result.error).toContain('Invalid request origin');
    });

    it('should fail for POST requests with mismatched CSRF tokens', async () => {
      const otherToken = generateCsrfToken();

      const headers: RequestHeaders = {
        get: vi.fn((name: string) => {
          if (name === 'origin') return 'https://example.com';
          if (name === 'host') return 'example.com';
          if (name === 'x-csrf-token') return otherToken;
          return null;
        }),
      };

      const cookies: RequestCookies = {
        get: vi.fn((name: string) =>
          name === 'csrf_token' ? { name: 'csrf_token', value: validCsrfToken } : undefined
        ),
        getAll: vi.fn(() => []),
      };

      const result = await verifyCsrfProtection('POST', headers, cookies);

      expect(result.success).toBe(false);
      expect(result.status).toBe(403);
      expect(result.error).toContain('Invalid CSRF token');
    });

    it('should fail for POST requests with missing CSRF cookie', async () => {
      const headers: RequestHeaders = {
        get: vi.fn((name: string) => {
          if (name === 'origin') return 'https://example.com';
          if (name === 'host') return 'example.com';
          if (name === 'x-csrf-token') return validCsrfToken;
          return null;
        }),
      };

      const cookies: RequestCookies = {
        get: vi.fn(() => undefined), // No cookie
        getAll: vi.fn(() => []),
      };

      const result = await verifyCsrfProtection('POST', headers, cookies);

      expect(result.success).toBe(false);
      expect(result.status).toBe(403);
    });

    it('should fail for POST requests with missing CSRF header', async () => {
      const headers: RequestHeaders = {
        get: vi.fn((name: string) => {
          if (name === 'origin') return 'https://example.com';
          if (name === 'host') return 'example.com';
          if (name === 'x-csrf-token') return null; // No header
          return null;
        }),
      };

      const cookies: RequestCookies = {
        get: vi.fn((name: string) =>
          name === 'csrf_token' ? { name: 'csrf_token', value: validCsrfToken } : undefined
        ),
        getAll: vi.fn(() => []),
      };

      const result = await verifyCsrfProtection('POST', headers, cookies);

      expect(result.success).toBe(false);
      expect(result.status).toBe(403);
    });

    it('should verify CSRF for PUT requests', async () => {
      const headers: RequestHeaders = {
        get: vi.fn((name: string) => {
          if (name === 'origin') return 'https://example.com';
          if (name === 'host') return 'example.com';
          if (name === 'x-csrf-token') return validCsrfToken;
          return null;
        }),
      };

      const cookies: RequestCookies = {
        get: vi.fn((name: string) =>
          name === 'csrf_token' ? { name: 'csrf_token', value: validCsrfToken } : undefined
        ),
        getAll: vi.fn(() => []),
      };

      const result = await verifyCsrfProtection('PUT', headers, cookies);

      expect(result.success).toBe(true);
    });

    it('should verify CSRF for DELETE requests', async () => {
      const headers: RequestHeaders = {
        get: vi.fn((name: string) => {
          if (name === 'origin') return 'https://example.com';
          if (name === 'host') return 'example.com';
          if (name === 'x-csrf-token') return validCsrfToken;
          return null;
        }),
      };

      const cookies: RequestCookies = {
        get: vi.fn((name: string) =>
          name === 'csrf_token' ? { name: 'csrf_token', value: validCsrfToken } : undefined
        ),
        getAll: vi.fn(() => []),
      };

      const result = await verifyCsrfProtection('DELETE', headers, cookies);

      expect(result.success).toBe(true);
    });

    it('should verify CSRF for PATCH requests', async () => {
      const headers: RequestHeaders = {
        get: vi.fn((name: string) => {
          if (name === 'origin') return 'https://example.com';
          if (name === 'host') return 'example.com';
          if (name === 'x-csrf-token') return validCsrfToken;
          return null;
        }),
      };

      const cookies: RequestCookies = {
        get: vi.fn((name: string) =>
          name === 'csrf_token' ? { name: 'csrf_token', value: validCsrfToken } : undefined
        ),
        getAll: vi.fn(() => []),
      };

      const result = await verifyCsrfProtection('PATCH', headers, cookies);

      expect(result.success).toBe(true);
    });
  });

  describe('verifyAuthentication', () => {
    let validToken: string;

    beforeEach(async () => {
      validToken = await signJWT({
        conferenceId: 'conf-001',
        staffName: 'John Doe',
        role: 'staff',
      });
    });

    it('should succeed with valid JWT token', async () => {
      const cookies: RequestCookies = {
        get: vi.fn((name: string) =>
          name === 'auth_token' ? { name: 'auth_token', value: validToken } : undefined
        ),
        getAll: vi.fn(() => [{ name: 'auth_token', value: validToken }]),
      };

      const result = await verifyAuthentication(cookies);

      expect(result.success).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.conferenceId).toBe('conf-001');
      expect(result.payload?.staffName).toBe('John Doe');
      expect(result.payload?.role).toBe('staff');
    });

    it('should fail when auth token is missing', async () => {
      const cookies: RequestCookies = {
        get: vi.fn(() => undefined), // No token
        getAll: vi.fn(() => []),
      };

      const result = await verifyAuthentication(cookies);

      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
      expect(result.error).toContain('No token provided');
    });

    it('should fail with invalid JWT token', async () => {
      const cookies: RequestCookies = {
        get: vi.fn((name: string) =>
          name === 'auth_token' ? { name: 'auth_token', value: 'invalid.token.here' } : undefined
        ),
        getAll: vi.fn(() => [{ name: 'auth_token', value: 'invalid.token.here' }]),
      };

      const result = await verifyAuthentication(cookies);

      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
      expect(result.error).toContain('Invalid or expired token');
    });

    it('should fail with expired JWT token', async () => {
      // Generate an expired token using the test helper
      const { generateExpiredTestToken } = await import('@/test/helpers');
      const expiredToken = await generateExpiredTestToken({
        conferenceId: 'conf-001',
        staffName: 'John Doe',
        role: 'staff',
      });

      const cookies: RequestCookies = {
        get: vi.fn((name: string) =>
          name === 'auth_token' ? { name: 'auth_token', value: expiredToken } : undefined
        ),
        getAll: vi.fn(() => [{ name: 'auth_token', value: expiredToken }]),
      };

      const result = await verifyAuthentication(cookies);

      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
    });
  });

  describe('createUserHeaders', () => {
    it('should create headers from JWT payload with Base64-encoded staff name', () => {
      const payload = {
        conferenceId: 'conf-001',
        staffName: 'John Doe',
        role: 'staff' as const,
      };

      const headers = createUserHeaders(payload);
      const expectedEncodedName = Buffer.from('John Doe', 'utf-8').toString('base64');

      expect(headers).toEqual({
        'x-user-conference-id': 'conf-001',
        'x-user-staff-name': expectedEncodedName,
        'x-user-role': 'staff',
      });
    });

    it('should create headers for admin role with Base64-encoded staff name', () => {
      const payload = {
        conferenceId: 'conf-002',
        staffName: 'Admin User',
        role: 'admin' as const,
      };

      const headers = createUserHeaders(payload);
      const expectedEncodedName = Buffer.from('Admin User', 'utf-8').toString('base64');

      expect(headers).toEqual({
        'x-user-conference-id': 'conf-002',
        'x-user-staff-name': expectedEncodedName,
        'x-user-role': 'admin',
      });
    });

    it('should handle Japanese characters in staff name with Base64 encoding', () => {
      const payload = {
        conferenceId: 'conf-003',
        staffName: '山田太郎',
        role: 'staff' as const,
      };

      const headers = createUserHeaders(payload);
      const encodedName = headers['x-user-staff-name'];

      // Verify it's Base64 encoded
      const decodedName = Buffer.from(encodedName, 'base64').toString('utf-8');
      expect(decodedName).toBe('山田太郎');
    });

    it('should correctly encode and decode various non-ASCII characters', () => {
      const testCases = [
        '山田太郎', // Japanese
        'Müller', // German
        'José', // Spanish
        '김철수', // Korean
        '张伟', // Chinese
      ];

      testCases.forEach((staffName) => {
        const payload = {
          conferenceId: 'conf-test',
          staffName,
          role: 'staff' as const,
        };

        const headers = createUserHeaders(payload);
        const encodedName = headers['x-user-staff-name'];
        const decodedName = Buffer.from(encodedName, 'base64').toString('utf-8');

        expect(decodedName).toBe(staffName);
      });
    });
  });
});
