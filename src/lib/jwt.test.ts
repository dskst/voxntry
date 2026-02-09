/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { signJWT, verifyJWT, type AuthPayload } from './jwt';
import { generateTestToken, generateExpiredTestToken } from '@/test/helpers';

describe('jwt', () => {
  const validPayload: AuthPayload = {
    conferenceId: 'conf-001',
    staffName: 'John Doe',
    role: 'staff',
  };

  const adminPayload: AuthPayload = {
    conferenceId: 'conf-002',
    staffName: 'Admin User',
    role: 'admin',
  };

  beforeEach(() => {
    // Ensure JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'test-jwt-secret-key-min-32-chars-long';
    }
  });

  describe('signJWT', () => {
    it('should sign a JWT token with staff role', async () => {
      const token = await signJWT(validPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should sign a JWT token with admin role', async () => {
      const token = await signJWT(adminPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should create tokens that can be verified', async () => {
      const token = await signJWT(validPayload);
      const decoded = await verifyJWT(token);

      expect(decoded).toEqual(validPayload);
    });

    it('should throw error if JWT_SECRET is missing', async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      await expect(signJWT(validPayload)).rejects.toThrow(
        'JWT_SECRET environment variable is required'
      );

      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('verifyJWT', () => {
    it('should verify a valid JWT token', async () => {
      const token = await signJWT(validPayload);
      const decoded = await verifyJWT(token);

      expect(decoded).toEqual(validPayload);
    });

    it('should verify admin role token', async () => {
      const token = await signJWT(adminPayload);
      const decoded = await verifyJWT(token);

      expect(decoded).toEqual(adminPayload);
    });

    it('should return null for invalid token', async () => {
      const invalidToken = 'invalid.jwt.token';
      const decoded = await verifyJWT(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should return null for empty token', async () => {
      const decoded = await verifyJWT('');

      expect(decoded).toBeNull();
    });

    it('should return null for expired token', async () => {
      const expiredToken = await generateExpiredTestToken({
        conferenceId: 'conf-001',
        staffName: 'John Doe',
        role: 'staff',
      });

      const decoded = await verifyJWT(expiredToken);

      expect(decoded).toBeNull();
    });

    it('should return null for token with wrong secret', async () => {
      const token = await generateTestToken(validPayload, 'wrong-secret-key-that-is-long-enough');
      const decoded = await verifyJWT(token);

      expect(decoded).toBeNull();
    });

    it('should return null for token with invalid payload structure', async () => {
      const invalidPayload = {
        conferenceId: 'conf-001',
        // missing staffName and role
      };

      const token = await generateTestToken(invalidPayload);
      const decoded = await verifyJWT(token);

      expect(decoded).toBeNull();
    });

    it('should return null for token with invalid role', async () => {
      const invalidRolePayload = {
        conferenceId: 'conf-001',
        staffName: 'John Doe',
        role: 'invalid-role',
      };

      const token = await generateTestToken(invalidRolePayload);
      const decoded = await verifyJWT(token);

      expect(decoded).toBeNull();
    });

    it('should return null for token with non-string conferenceId', async () => {
      const invalidPayload = {
        conferenceId: 123,
        staffName: 'John Doe',
        role: 'staff',
      };

      const token = await generateTestToken(invalidPayload);
      const decoded = await verifyJWT(token);

      expect(decoded).toBeNull();
    });

    it('should return null for token with non-string staffName', async () => {
      const invalidPayload = {
        conferenceId: 'conf-001',
        staffName: null,
        role: 'staff',
      };

      const token = await generateTestToken(invalidPayload);
      const decoded = await verifyJWT(token);

      expect(decoded).toBeNull();
    });

    it('should return null if JWT_SECRET is missing during verification', async () => {
      const originalSecret = process.env.JWT_SECRET;
      const token = await signJWT(validPayload);

      delete process.env.JWT_SECRET;

      const decoded = await verifyJWT(token);
      expect(decoded).toBeNull();

      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('JWT payload validation', () => {
    it('should accept payload with minimal valid data', async () => {
      const minimalPayload: AuthPayload = {
        conferenceId: 'c',
        staffName: 'S',
        role: 'staff',
      };

      const token = await signJWT(minimalPayload);
      const decoded = await verifyJWT(token);

      expect(decoded).toEqual(minimalPayload);
    });

    it('should handle long strings in payload', async () => {
      const longPayload: AuthPayload = {
        conferenceId: 'very-long-conference-id-with-many-characters',
        staffName: 'Very Long Staff Name with Special Characters!@#$%',
        role: 'admin',
      };

      const token = await signJWT(longPayload);
      const decoded = await verifyJWT(token);

      expect(decoded).toEqual(longPayload);
    });

    it('should handle Japanese characters in payload', async () => {
      const japanesePayload: AuthPayload = {
        conferenceId: 'conf-jp',
        staffName: '山田太郎',
        role: 'staff',
      };

      const token = await signJWT(japanesePayload);
      const decoded = await verifyJWT(token);

      expect(decoded).toEqual(japanesePayload);
    });
  });
});
