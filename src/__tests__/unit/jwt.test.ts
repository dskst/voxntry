// @vitest-environment node

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signJWT, verifyJWT, type AuthPayload } from '@/lib/jwt';

/**
 * Comprehensive JWT Tests
 *
 * Coverage:
 * - Token signing and verification
 * - Payload validation
 * - Expiration handling
 * - Security edge cases
 * - Error scenarios
 *
 * NOTE: Uses 'node' environment instead of 'jsdom' to fix jose/TextEncoder compatibility
 */

describe('JWT - Comprehensive Unit Tests', () => {
  // Store original env
  const originalEnv = process.env.JWT_SECRET;

  beforeEach(() => {
    // Ensure JWT_SECRET is set (from setup.ts)
    process.env.JWT_SECRET = 'test-jwt-secret-key-min-32-chars-long';
  });

  afterEach(() => {
    // Restore original env
    process.env.JWT_SECRET = originalEnv;
  });

  describe('signJWT - Token Generation', () => {
    it('should generate a valid JWT token with staff role', async () => {
      const payload: AuthPayload = {
        conferenceId: 'test-conf-2026',
        staffName: 'John Doe',
        role: 'staff'
      };

      const token = await signJWT(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should generate a valid JWT token with admin role', async () => {
      const payload: AuthPayload = {
        conferenceId: 'admin-conf',
        staffName: 'Admin User',
        role: 'admin'
      };

      const token = await signJWT(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should throw error when JWT_SECRET is missing', async () => {
      delete process.env.JWT_SECRET;

      const payload: AuthPayload = {
        conferenceId: 'test',
        staffName: 'Test',
        role: 'staff'
      };

      await expect(signJWT(payload)).rejects.toThrow('JWT_SECRET environment variable is required');
    });

    it('should handle special characters in payload fields', async () => {
      const payload: AuthPayload = {
        conferenceId: 'test-conf-2026',
        staffName: 'José García-Martínez',
        role: 'staff'
      };

      const token = await signJWT(payload);

      expect(token).toBeDefined();
    });

    it('should handle Japanese characters in staffName', async () => {
      const payload: AuthPayload = {
        conferenceId: 'test-conf-2026',
        staffName: '山田太郎',
        role: 'staff'
      };

      const token = await signJWT(payload);

      expect(token).toBeDefined();
    });

    it('should handle maximum length conference ID', async () => {
      const payload: AuthPayload = {
        conferenceId: 'a'.repeat(100),
        staffName: 'Test User',
        role: 'staff'
      };

      const token = await signJWT(payload);

      expect(token).toBeDefined();
    });

    it('should handle maximum length staff name', async () => {
      const payload: AuthPayload = {
        conferenceId: 'test-conf',
        staffName: 'a'.repeat(100),
        role: 'staff'
      };

      const token = await signJWT(payload);

      expect(token).toBeDefined();
    });
  });

  describe('verifyJWT - Token Verification', () => {
    it('should verify and decode a valid token', async () => {
      const originalPayload: AuthPayload = {
        conferenceId: 'test-conf-2026',
        staffName: 'John Doe',
        role: 'staff'
      };

      const token = await signJWT(originalPayload);
      const verified = await verifyJWT(token);

      expect(verified).toBeDefined();
      expect(verified?.conferenceId).toBe(originalPayload.conferenceId);
      expect(verified?.staffName).toBe(originalPayload.staffName);
      expect(verified?.role).toBe(originalPayload.role);
    });

    it('should verify admin role token', async () => {
      const originalPayload: AuthPayload = {
        conferenceId: 'admin-conf',
        staffName: 'Admin User',
        role: 'admin'
      };

      const token = await signJWT(originalPayload);
      const verified = await verifyJWT(token);

      expect(verified).toBeDefined();
      expect(verified?.role).toBe('admin');
    });

    it('should return null for invalid token format', async () => {
      const verified = await verifyJWT('invalid-token-12345');

      expect(verified).toBeNull();
    });

    it('should return null for empty token', async () => {
      const verified = await verifyJWT('');

      expect(verified).toBeNull();
    });

    it('should return null for malformed JWT (missing parts)', async () => {
      const verified = await verifyJWT('header.payload');

      expect(verified).toBeNull();
    });

    it('should return null for token with invalid signature', async () => {
      const token = await signJWT({
        conferenceId: 'test',
        staffName: 'Test',
        role: 'staff'
      });

      // Tamper with signature
      const parts = token.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.invalid-signature`;

      const verified = await verifyJWT(tamperedToken);

      expect(verified).toBeNull();
    });

    it('should return null when JWT_SECRET is different', async () => {
      const token = await signJWT({
        conferenceId: 'test',
        staffName: 'Test',
        role: 'staff'
      });

      // Change secret
      process.env.JWT_SECRET = 'different-secret-key-min-32-chars-long-xyz';

      const verified = await verifyJWT(token);

      expect(verified).toBeNull();
    });

    it('should preserve special characters in decoded payload', async () => {
      const originalPayload: AuthPayload = {
        conferenceId: 'test-conf',
        staffName: 'José García',
        role: 'staff'
      };

      const token = await signJWT(originalPayload);
      const verified = await verifyJWT(token);

      expect(verified?.staffName).toBe('José García');
    });

    it('should preserve Japanese characters in decoded payload', async () => {
      const originalPayload: AuthPayload = {
        conferenceId: 'test-conf',
        staffName: '山田太郎',
        role: 'staff'
      };

      const token = await signJWT(originalPayload);
      const verified = await verifyJWT(token);

      expect(verified?.staffName).toBe('山田太郎');
    });
  });

  describe('Payload Validation', () => {
    it('should return null for token missing conferenceId', async () => {
      // Create token with incomplete payload using jose directly
      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

      const token = await new SignJWT({
        staffName: 'Test',
        role: 'staff'
        // Missing conferenceId
      } as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

      const verified = await verifyJWT(token);

      expect(verified).toBeNull();
    });

    it('should return null for token missing staffName', async () => {
      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

      const token = await new SignJWT({
        conferenceId: 'test',
        role: 'staff'
        // Missing staffName
      } as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

      const verified = await verifyJWT(token);

      expect(verified).toBeNull();
    });

    it('should return null for token missing role', async () => {
      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

      const token = await new SignJWT({
        conferenceId: 'test',
        staffName: 'Test'
        // Missing role
      } as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

      const verified = await verifyJWT(token);

      expect(verified).toBeNull();
    });

    it('should return null for token with invalid role', async () => {
      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

      const token = await new SignJWT({
        conferenceId: 'test',
        staffName: 'Test',
        role: 'superadmin' // Invalid role
      } as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

      const verified = await verifyJWT(token);

      expect(verified).toBeNull();
    });

    it('should return null for token with wrong field types', async () => {
      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

      const token = await new SignJWT({
        conferenceId: 12345, // Should be string
        staffName: 'Test',
        role: 'staff'
      } as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

      const verified = await verifyJWT(token);

      expect(verified).toBeNull();
    });
  });

  describe('Expiration Handling', () => {
    it('should accept token that expires in the future', async () => {
      const token = await signJWT({
        conferenceId: 'test',
        staffName: 'Test',
        role: 'staff'
      });

      // Token should be valid immediately after creation
      const verified = await verifyJWT(token);

      expect(verified).toBeDefined();
    });

    it('should reject expired token', async () => {
      // Create an expired token using jose directly
      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

      const token = await new SignJWT({
        conferenceId: 'test',
        staffName: 'Test',
        role: 'staff'
      } as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 7200) // 2 hours ago
        .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // 1 hour ago (expired)
        .sign(secret);

      const verified = await verifyJWT(token);

      expect(verified).toBeNull();
    });
  });

  describe('Security Tests', () => {
    it('should not leak information in error messages', async () => {
      // This is a characterization test - we verify behavior doesn't change
      // The function logs to console.error but returns null
      const verified = await verifyJWT('invalid-token');

      expect(verified).toBeNull();
      // Should not throw or expose internal details
    });

    it('should handle concurrent verification requests', async () => {
      const token = await signJWT({
        conferenceId: 'test',
        staffName: 'Test',
        role: 'staff'
      });

      // Verify same token multiple times concurrently
      const results = await Promise.all([
        verifyJWT(token),
        verifyJWT(token),
        verifyJWT(token),
        verifyJWT(token),
        verifyJWT(token)
      ]);

      // All should succeed
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result?.conferenceId).toBe('test');
      });
    });

    it('should handle very long tokens gracefully', async () => {
      const veryLongToken = 'a'.repeat(10000);

      const verified = await verifyJWT(veryLongToken);

      expect(verified).toBeNull();
    });

    it('should handle tokens with null bytes', async () => {
      const tokenWithNullByte = 'header.payload\x00.signature';

      const verified = await verifyJWT(tokenWithNullByte);

      expect(verified).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string conferenceId after signing', async () => {
      // While empty string shouldn't be allowed by validation,
      // test JWT handling if it somehow gets through
      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

      const token = await new SignJWT({
        conferenceId: '',
        staffName: 'Test',
        role: 'staff'
      } as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

      const verified = await verifyJWT(token);

      // Should still decode, validation happens at API level
      expect(verified).toBeDefined();
      expect(verified?.conferenceId).toBe('');
    });

    it('should handle whitespace-only staffName', async () => {
      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

      const token = await new SignJWT({
        conferenceId: 'test',
        staffName: '   ',
        role: 'staff'
      } as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

      const verified = await verifyJWT(token);

      expect(verified).toBeDefined();
      expect(verified?.staffName).toBe('   ');
    });
  });
});
