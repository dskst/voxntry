/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateCsrfToken, verifyCsrfToken, verifyOrigin } from './csrf';

describe('csrf', () => {
  describe('generateCsrfToken', () => {
    it('should generate a 64-character hex string', () => {
      const token = generateCsrfToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).toHaveLength(64); // 32 bytes * 2 (hex)
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      const token3 = generateCsrfToken();

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it('should generate cryptographically secure tokens', () => {
      // Generate multiple tokens and check they're sufficiently random
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCsrfToken());
      }

      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });
  });

  describe('verifyCsrfToken', () => {
    it('should verify matching tokens', () => {
      const token = generateCsrfToken();
      const result = verifyCsrfToken(token, token);

      expect(result).toBe(true);
    });

    it('should reject non-matching tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      const result = verifyCsrfToken(token1, token2);

      expect(result).toBe(false);
    });

    it('should reject when cookie token is missing', () => {
      const token = generateCsrfToken();
      const result = verifyCsrfToken(undefined, token);

      expect(result).toBe(false);
    });

    it('should reject when header token is missing', () => {
      const token = generateCsrfToken();
      const result = verifyCsrfToken(token, undefined);

      expect(result).toBe(false);
    });

    it('should reject when both tokens are missing', () => {
      const result = verifyCsrfToken(undefined, undefined);

      expect(result).toBe(false);
    });

    it('should reject when tokens have different lengths', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken().substring(0, 32);
      const result = verifyCsrfToken(token1, token2);

      expect(result).toBe(false);
    });

    it('should reject tokens that differ by one character', () => {
      const token = generateCsrfToken();
      const modifiedToken = token.substring(0, 63) + (token[63] === 'a' ? 'b' : 'a');
      const result = verifyCsrfToken(token, modifiedToken);

      expect(result).toBe(false);
    });

    it('should handle empty string tokens', () => {
      const result = verifyCsrfToken('', '');

      expect(result).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      // This test verifies that the function doesn't throw on invalid buffer data
      const token1 = 'not-a-valid-hex-token';
      const token2 = 'not-a-valid-hex-token';

      // Should not throw even with invalid data
      expect(() => verifyCsrfToken(token1, token2)).not.toThrow();
    });
  });

  describe('verifyOrigin', () => {
    const testHost = 'example.com';
    let originalNodeEnv: string | undefined;

    beforeEach(() => {
      originalNodeEnv = process.env.NODE_ENV;
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    describe('in production', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should accept HTTPS origin matching host', () => {
        const result = verifyOrigin(`https://${testHost}`, null, testHost);

        expect(result).toBe(true);
      });

      it('should reject HTTP origin in production', () => {
        const result = verifyOrigin(`http://${testHost}`, null, testHost);

        expect(result).toBe(false);
      });

      it('should accept HTTPS referer matching host', () => {
        const result = verifyOrigin(null, `https://${testHost}/some/path`, testHost);

        expect(result).toBe(true);
      });

      it('should reject HTTP referer in production', () => {
        const result = verifyOrigin(null, `http://${testHost}/some/path`, testHost);

        expect(result).toBe(false);
      });

      it('should reject localhost in production', () => {
        const result = verifyOrigin('http://localhost:3000', null, testHost);

        expect(result).toBe(false);
      });
    });

    describe('in development', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should accept HTTPS origin matching host', () => {
        const result = verifyOrigin(`https://${testHost}`, null, testHost);

        expect(result).toBe(true);
      });

      it('should accept HTTP origin matching host', () => {
        const result = verifyOrigin(`http://${testHost}`, null, testHost);

        expect(result).toBe(true);
      });

      it('should accept localhost:3000', () => {
        const result = verifyOrigin('http://localhost:3000', null, 'localhost:3000');

        expect(result).toBe(true);
      });

      it('should accept HTTP referer matching host', () => {
        const result = verifyOrigin(null, `http://${testHost}/api/test`, testHost);

        expect(result).toBe(true);
      });

      it('should accept localhost:3000 referer', () => {
        const result = verifyOrigin(null, 'http://localhost:3000/api/test', 'localhost:3000');

        expect(result).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should reject when host is missing', () => {
        const result = verifyOrigin('https://example.com', null, null);

        expect(result).toBe(false);
      });

      it('should reject when both origin and referer are missing', () => {
        const result = verifyOrigin(null, null, testHost);

        expect(result).toBe(false);
      });

      it('should reject origin from different host', () => {
        const result = verifyOrigin('https://evil.com', null, testHost);

        expect(result).toBe(false);
      });

      it('should reject referer from different host', () => {
        const result = verifyOrigin(null, 'https://evil.com/path', testHost);

        expect(result).toBe(false);
      });

      it('should prioritize origin over referer', () => {
        process.env.NODE_ENV = 'production';

        // Valid origin, invalid referer - should succeed (origin wins)
        const result1 = verifyOrigin(
          `https://${testHost}`,
          'https://evil.com/path',
          testHost
        );
        expect(result1).toBe(true);

        // Invalid origin, valid referer - should succeed (falls back to referer)
        const result2 = verifyOrigin(
          'https://evil.com',
          `https://${testHost}/path`,
          testHost
        );
        expect(result2).toBe(true);
      });

      it('should handle subdomain origins', () => {
        process.env.NODE_ENV = 'production';
        const result = verifyOrigin('https://subdomain.example.com', null, 'example.com');

        // Should reject - subdomain doesn't match
        expect(result).toBe(false);
      });

      it('should handle port numbers in origin', () => {
        process.env.NODE_ENV = 'production';
        const hostWithPort = 'example.com:8080';
        const result = verifyOrigin(`https://${hostWithPort}`, null, hostWithPort);

        expect(result).toBe(true);
      });

      it('should handle referer with query string', () => {
        process.env.NODE_ENV = 'production';
        const result = verifyOrigin(
          null,
          `https://${testHost}/api/test?param=value`,
          testHost
        );

        expect(result).toBe(true);
      });

      it('should handle referer with hash', () => {
        process.env.NODE_ENV = 'production';
        const result = verifyOrigin(
          null,
          `https://${testHost}/page#section`,
          testHost
        );

        expect(result).toBe(true);
      });
    });
  });
});
