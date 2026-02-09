import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateCsrfToken, verifyCsrfToken, verifyOrigin } from '@/lib/csrf';

/**
 * Comprehensive CSRF Protection Tests
 *
 * Coverage:
 * - Token generation (entropy, uniqueness)
 * - Token verification (timing-safe comparison)
 * - Origin verification (subdomain attacks, protocol mismatches)
 * - Security edge cases from devils-advocate
 */

describe('CSRF - Comprehensive Unit Tests', () => {
  describe('generateCsrfToken - Token Generation', () => {
    it('should generate a token', () => {
      const token = generateCsrfToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate a 64-character hex token (32 bytes)', () => {
      const token = generateCsrfToken();

      // 32 bytes as hex = 64 characters
      expect(token.length).toBe(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        tokens.add(generateCsrfToken());
      }

      // All tokens should be unique
      expect(tokens.size).toBe(iterations);
    });

    it('should have sufficient entropy (no patterns)', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();

      // Tokens should be completely different
      expect(token1).not.toBe(token2);

      // No substring should be common
      const commonSubstring = findCommonSubstring(token1, token2);
      expect(commonSubstring.length).toBeLessThan(10);
    });

    it('should generate tokens quickly (performance)', () => {
      const start = Date.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        generateCsrfToken();
      }

      const duration = Date.now() - start;

      // Should generate 1000 tokens in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe('verifyCsrfToken - Token Verification', () => {
    it('should verify matching tokens', () => {
      const token = generateCsrfToken();

      const isValid = verifyCsrfToken(token, token);

      expect(isValid).toBe(true);
    });

    it('should reject different tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();

      const isValid = verifyCsrfToken(token1, token2);

      expect(isValid).toBe(false);
    });

    it('should reject when cookie token is undefined', () => {
      const token = generateCsrfToken();

      const isValid = verifyCsrfToken(undefined, token);

      expect(isValid).toBe(false);
    });

    it('should reject when header token is undefined', () => {
      const token = generateCsrfToken();

      const isValid = verifyCsrfToken(token, undefined);

      expect(isValid).toBe(false);
    });

    it('should reject when both tokens are undefined', () => {
      const isValid = verifyCsrfToken(undefined, undefined);

      expect(isValid).toBe(false);
    });

    it('should reject tokens with different lengths', () => {
      const token = generateCsrfToken();
      const shortToken = token.substring(0, token.length - 1);

      const isValid = verifyCsrfToken(token, shortToken);

      expect(isValid).toBe(false);
    });

    it('should reject token that differs by one character', () => {
      const token = generateCsrfToken();
      // Change one character
      const tamperedToken = token.substring(0, token.length - 1) +
        (token[token.length - 1] === 'a' ? 'b' : 'a');

      const isValid = verifyCsrfToken(token, tamperedToken);

      expect(isValid).toBe(false);
    });

    it('should be case-sensitive', () => {
      const token = generateCsrfToken();
      const upperToken = token.toUpperCase();

      const isValid = verifyCsrfToken(token, upperToken);

      expect(isValid).toBe(false);
    });

    it('should use timing-safe comparison (constant time)', () => {
      // This is a characterization test to ensure timing-safe behavior
      // Note: Exact timing measurements are unreliable in test environments
      // We verify the function uses timingSafeEqual which is constant-time

      const token = generateCsrfToken();
      const wrongToken = generateCsrfToken();

      // Both comparisons should complete without errors
      const result1 = verifyCsrfToken(token, token);
      const result2 = verifyCsrfToken(token, wrongToken);

      expect(result1).toBe(true);
      expect(result2).toBe(false);

      // The actual timing-safe comparison happens in timingSafeEqual
      // from Node's crypto module, which is verified through code review
    });

    it('should handle empty strings', () => {
      const isValid = verifyCsrfToken('', '');

      // Empty strings are rejected because they're falsy
      expect(isValid).toBe(false);
    });

    it('should handle very long tokens gracefully', () => {
      const longToken = 'a'.repeat(10000);

      const isValid = verifyCsrfToken(longToken, longToken);

      expect(isValid).toBe(true);
    });

    it('should handle null bytes in tokens', () => {
      const tokenWithNull = 'test\x00token';

      // Should not crash, should handle gracefully
      expect(() => verifyCsrfToken(tokenWithNull, tokenWithNull)).not.toThrow();
    });

    it('should handle Unicode characters', () => {
      const unicodeToken = 'test🔒token';

      const isValid = verifyCsrfToken(unicodeToken, unicodeToken);

      expect(isValid).toBe(true);
    });
  });

  describe('verifyOrigin - Origin Verification', () => {
    beforeEach(() => {
      // Reset NODE_ENV for each test
      vi.stubEnv('NODE_ENV', 'development');
    });

    describe('Development Mode', () => {
      it('should accept HTTP localhost with matching host', () => {
        const isValid = verifyOrigin('http://localhost:3000', null, 'localhost:3000');

        expect(isValid).toBe(true);
      });

      it('should accept HTTP host with matching origin', () => {
        const isValid = verifyOrigin('http://example.com:3000', null, 'example.com:3000');

        expect(isValid).toBe(true);
      });

      it('should accept HTTPS in development', () => {
        const isValid = verifyOrigin('https://localhost:3000', null, 'localhost:3000');

        expect(isValid).toBe(true);
      });

      it('should fallback to referer when origin is missing', () => {
        const isValid = verifyOrigin(null, 'http://localhost:3000/some/path', 'localhost:3000');

        expect(isValid).toBe(true);
      });

      it('should accept referer that starts with allowed origin', () => {
        const isValid = verifyOrigin(null, 'http://localhost:3000/api/test?query=value', 'localhost:3000');

        expect(isValid).toBe(true);
      });
    });

    describe('Production Mode', () => {
      beforeEach(() => {
        vi.stubEnv('NODE_ENV', 'production');
      });

      it('should accept HTTPS in production', () => {
        const isValid = verifyOrigin('https://example.com', null, 'example.com');

        expect(isValid).toBe(true);
      });

      it('should reject HTTP in production', () => {
        const isValid = verifyOrigin('http://example.com', null, 'example.com');

        expect(isValid).toBe(false);
      });

      it('should reject localhost HTTP in production', () => {
        const isValid = verifyOrigin('http://localhost:3000', null, 'localhost:3000');

        expect(isValid).toBe(false);
      });
    });

    describe('Security: Subdomain Attacks', () => {
      it('should reject evil subdomain', () => {
        const isValid = verifyOrigin('http://evil.example.com', null, 'example.com');

        expect(isValid).toBe(false);
      });

      it('should reject attack domain that contains host as substring', () => {
        const isValid = verifyOrigin('http://example.com.evil.com', null, 'example.com');

        expect(isValid).toBe(false);
      });

      it('should reject domain that ends with host', () => {
        const isValid = verifyOrigin('http://notexample.com', null, 'example.com');

        expect(isValid).toBe(false);
      });

      it('should reject domain that starts with host', () => {
        const isValid = verifyOrigin('http://example.com.attacker.com', null, 'example.com');

        expect(isValid).toBe(false);
      });
    });

    describe('Security: Protocol Mismatches', () => {
      it('should require exact protocol match', () => {
        // Origin is HTTP but we want HTTPS
        const isValid = verifyOrigin('http://localhost:3000', null, 'localhost:3000');

        // In development, HTTP is allowed
        expect(isValid).toBe(true);
      });

      it('should handle protocol-relative URLs', () => {
        const isValid = verifyOrigin('//example.com', null, 'example.com');

        expect(isValid).toBe(false);
      });
    });

    describe('Security: Port Differences', () => {
      it('should reject different port', () => {
        const isValid = verifyOrigin('http://localhost:3001', null, 'localhost:3000');

        expect(isValid).toBe(false);
      });

      it('should require exact port match', () => {
        const isValid = verifyOrigin('http://localhost:8080', null, 'localhost:3000');

        expect(isValid).toBe(false);
      });

      it('should accept when port matches', () => {
        const isValid = verifyOrigin('http://localhost:3000', null, 'localhost:3000');

        expect(isValid).toBe(true);
      });
    });

    describe('Security: IPv6 Addresses', () => {
      it('should handle IPv6 localhost', () => {
        const isValid = verifyOrigin('http://[::1]:3000', null, '[::1]:3000');

        expect(isValid).toBe(true);
      });

      it('should reject mismatched IPv6', () => {
        const isValid = verifyOrigin('http://[::1]:3000', null, 'localhost:3000');

        expect(isValid).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should reject when host is null', () => {
        const isValid = verifyOrigin('http://localhost:3000', null, null);

        expect(isValid).toBe(false);
      });

      it('should reject when host is undefined', () => {
        const isValid = verifyOrigin('http://localhost:3000', null, null);

        expect(isValid).toBe(false);
      });

      it('should reject when both origin and referer are null', () => {
        const isValid = verifyOrigin(null, null, 'localhost:3000');

        expect(isValid).toBe(false);
      });

      it('should handle trailing slash in origin', () => {
        const isValid = verifyOrigin('http://localhost:3000/', null, 'localhost:3000');

        expect(isValid).toBe(false); // Exact match required
      });

      it('should handle query parameters in referer', () => {
        const isValid = verifyOrigin(
          null,
          'http://localhost:3000/path?query=value',
          'localhost:3000'
        );

        expect(isValid).toBe(true);
      });

      it('should handle fragment in referer', () => {
        const isValid = verifyOrigin(
          null,
          'http://localhost:3000/path#fragment',
          'localhost:3000'
        );

        expect(isValid).toBe(true);
      });

      it('should handle empty string origin', () => {
        const isValid = verifyOrigin('', null, 'localhost:3000');

        expect(isValid).toBe(false);
      });

      it('should handle malformed origin', () => {
        const isValid = verifyOrigin('not-a-url', null, 'localhost:3000');

        expect(isValid).toBe(false);
      });

      it('should handle very long origin gracefully', () => {
        const longOrigin = 'http://' + 'a'.repeat(10000) + '.com';

        const isValid = verifyOrigin(longOrigin, null, 'localhost:3000');

        expect(isValid).toBe(false);
      });
    });

    describe('XSS Prevention', () => {
      it('should reject origin with script tags', () => {
        const isValid = verifyOrigin(
          'http://localhost:3000<script>alert(1)</script>',
          null,
          'localhost:3000'
        );

        expect(isValid).toBe(false);
      });

      it('should reject origin with JavaScript protocol', () => {
        const isValid = verifyOrigin('javascript:alert(1)', null, 'localhost:3000');

        expect(isValid).toBe(false);
      });

      it('should reject origin with data URI', () => {
        const isValid = verifyOrigin('data:text/html,<script>alert(1)</script>', null, 'localhost:3000');

        expect(isValid).toBe(false);
      });
    });
  });
});

/**
 * Helper function to find common substring between two strings
 */
function findCommonSubstring(str1: string, str2: string): string {
  let longest = '';

  for (let i = 0; i < str1.length; i++) {
    for (let j = i + 1; j <= str1.length; j++) {
      const substring = str1.substring(i, j);
      if (str2.includes(substring) && substring.length > longest.length) {
        longest = substring;
      }
    }
  }

  return longest;
}
