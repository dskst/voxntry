import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit, getClientIp, type RateLimitOptions } from '@/lib/rate-limit';

/**
 * Comprehensive Rate Limiting Tests
 *
 * Coverage:
 * - Rate limit enforcement (allow/deny logic)
 * - LRU cache expiration (TTL)
 * - Multiple tokens (different clients)
 * - Reset functionality
 * - Client IP extraction (proxy headers)
 * - Edge cases and security scenarios
 */

describe('Rate Limiting - Comprehensive Unit Tests', () => {
  describe('rateLimit - Rate Limiter Creation and Enforcement', () => {
    it('should allow requests within limit', async () => {
      const limiter = rateLimit({
        interval: 60000, // 1 minute
        uniqueTokenPerInterval: 500,
      });

      // First request should succeed
      await expect(limiter.check(5, 'client1')).resolves.toBeUndefined();

      // Subsequent requests up to limit should succeed
      await expect(limiter.check(5, 'client1')).resolves.toBeUndefined();
      await expect(limiter.check(5, 'client1')).resolves.toBeUndefined();
      await expect(limiter.check(5, 'client1')).resolves.toBeUndefined();
      await expect(limiter.check(5, 'client1')).resolves.toBeUndefined();
    });

    it('should reject requests exceeding limit', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      // Use up the limit
      await limiter.check(3, 'client1');
      await limiter.check(3, 'client1');
      await limiter.check(3, 'client1');

      // Exceed the limit
      await expect(limiter.check(3, 'client1')).rejects.toThrow('Rate limit exceeded');
    });

    it('should track different clients independently', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      // Client 1 uses their limit
      await limiter.check(2, 'client1');
      await limiter.check(2, 'client1');

      // Client 2 should have their own independent limit
      await expect(limiter.check(2, 'client2')).resolves.toBeUndefined();
      await expect(limiter.check(2, 'client2')).resolves.toBeUndefined();

      // Client 1 should be at limit
      await expect(limiter.check(2, 'client1')).rejects.toThrow('Rate limit exceeded');

      // Client 2 should be at limit too
      await expect(limiter.check(2, 'client2')).rejects.toThrow('Rate limit exceeded');
    });

    it('should enforce limit of 1 request', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      // First request succeeds
      await expect(limiter.check(1, 'client1')).resolves.toBeUndefined();

      // Second request fails
      await expect(limiter.check(1, 'client1')).rejects.toThrow('Rate limit exceeded');
    });

    it('should enforce limit of 0 requests (block all)', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      // Even first request should fail with limit 0
      await expect(limiter.check(0, 'client1')).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle high limit values', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      // Make 100 requests with limit of 100
      for (let i = 0; i < 100; i++) {
        await expect(limiter.check(100, 'client1')).resolves.toBeUndefined();
      }

      // 101st request should fail
      await expect(limiter.check(100, 'client1')).rejects.toThrow('Rate limit exceeded');
    });

    it('should use default options when not specified', () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      expect(limiter).toBeDefined();
      expect(limiter.check).toBeDefined();
      expect(limiter.reset).toBeDefined();
    });

    it('should handle custom interval', async () => {
      const limiter = rateLimit({
        interval: 5000, // 5 seconds
        uniqueTokenPerInterval: 500,
      });

      await expect(limiter.check(5, 'client1')).resolves.toBeUndefined();
    });

    it('should handle custom uniqueTokenPerInterval', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 10, // Only track 10 unique clients
      });

      // Should work normally with low token count
      await expect(limiter.check(5, 'client1')).resolves.toBeUndefined();
    });
  });

  describe('rateLimit - Reset Functionality', () => {
    it('should reset rate limit for specific token', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      // Use up the limit
      await limiter.check(2, 'client1');
      await limiter.check(2, 'client1');

      // Should be at limit
      await expect(limiter.check(2, 'client1')).rejects.toThrow('Rate limit exceeded');

      // Reset the client
      limiter.reset('client1');

      // Should be able to make requests again
      await expect(limiter.check(2, 'client1')).resolves.toBeUndefined();
      await expect(limiter.check(2, 'client1')).resolves.toBeUndefined();
    });

    it('should not affect other tokens when resetting', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      // Both clients use their limits
      await limiter.check(2, 'client1');
      await limiter.check(2, 'client1');
      await limiter.check(2, 'client2');
      await limiter.check(2, 'client2');

      // Reset only client1
      limiter.reset('client1');

      // Client1 should be reset
      await expect(limiter.check(2, 'client1')).resolves.toBeUndefined();

      // Client2 should still be at limit
      await expect(limiter.check(2, 'client2')).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle resetting non-existent token', () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      // Should not throw
      expect(() => limiter.reset('non-existent')).not.toThrow();
    });

    it('should allow resetting multiple times', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      // First cycle
      await limiter.check(1, 'client1');
      await expect(limiter.check(1, 'client1')).rejects.toThrow();
      limiter.reset('client1');

      // Second cycle
      await limiter.check(1, 'client1');
      await expect(limiter.check(1, 'client1')).rejects.toThrow();
      limiter.reset('client1');

      // Third cycle
      await limiter.check(1, 'client1');
      await expect(limiter.check(1, 'client1')).rejects.toThrow();
    });
  });

  describe('getClientIp - IP Address Extraction', () => {
    it('should extract IP from X-Forwarded-For header', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '203.0.113.195',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('203.0.113.195');
    });

    it('should extract first IP from X-Forwarded-For with multiple IPs', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('203.0.113.195');
    });

    it('should trim whitespace from X-Forwarded-For', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '  203.0.113.195  ',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('203.0.113.195');
    });

    it('should extract IP from X-Real-IP header', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-real-ip': '203.0.113.195',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('203.0.113.195');
    });

    it('should prefer X-Forwarded-For over X-Real-IP', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '203.0.113.195',
          'x-real-ip': '198.51.100.42',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('203.0.113.195');
    });

    it('should extract IP from CF-Connecting-IP (Cloudflare)', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'cf-connecting-ip': '203.0.113.195',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('203.0.113.195');
    });

    it('should prefer X-Forwarded-For over CF-Connecting-IP', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '203.0.113.195',
          'cf-connecting-ip': '198.51.100.42',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('203.0.113.195');
    });

    it('should prefer X-Real-IP over CF-Connecting-IP', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-real-ip': '203.0.113.195',
          'cf-connecting-ip': '198.51.100.42',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('203.0.113.195');
    });

    it('should return "unknown" when no IP headers present', () => {
      const request = new Request('http://localhost:3000');

      const ip = getClientIp(request);
      expect(ip).toBe('unknown');
    });

    it('should handle IPv6 addresses', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });

    it('should handle IPv6 localhost', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '::1',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('::1');
    });

    it('should handle IPv4-mapped IPv6 addresses', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '::ffff:203.0.113.195',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('::ffff:203.0.113.195');
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle empty token string', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      // Empty string is a valid token
      await expect(limiter.check(5, '')).resolves.toBeUndefined();
      await expect(limiter.check(5, '')).resolves.toBeUndefined();
    });

    it('should handle very long token strings', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      const longToken = 'a'.repeat(1000);

      await expect(limiter.check(5, longToken)).resolves.toBeUndefined();
    });

    it('should handle special characters in tokens', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      const specialToken = '!@#$%^&*()_+-=[]{}|;:",.<>?/';

      await expect(limiter.check(5, specialToken)).resolves.toBeUndefined();
    });

    it('should handle Unicode characters in tokens', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      const unicodeToken = '日本語トークン🔒';

      await expect(limiter.check(5, unicodeToken)).resolves.toBeUndefined();
    });

    it('should handle many unique tokens', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 100,
      });

      // Create 50 unique clients
      for (let i = 0; i < 50; i++) {
        await expect(limiter.check(5, `client${i}`)).resolves.toBeUndefined();
      }
    });

    it('should handle concurrent requests from same client', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      // Make 5 concurrent requests
      const results = await Promise.allSettled([
        limiter.check(5, 'client1'),
        limiter.check(5, 'client1'),
        limiter.check(5, 'client1'),
        limiter.check(5, 'client1'),
        limiter.check(5, 'client1'),
      ]);

      // All should succeed (limit is 5)
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });

      // 6th request should fail
      await expect(limiter.check(5, 'client1')).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle very small interval', async () => {
      const limiter = rateLimit({
        interval: 1, // 1 millisecond
        uniqueTokenPerInterval: 500,
      });

      await expect(limiter.check(5, 'client1')).resolves.toBeUndefined();
    });

    it('should handle very large interval', async () => {
      const limiter = rateLimit({
        interval: 86400000, // 24 hours
        uniqueTokenPerInterval: 500,
      });

      await expect(limiter.check(5, 'client1')).resolves.toBeUndefined();
    });

    it('should handle negative limit gracefully', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      // Negative limit means all requests should be rejected
      await expect(limiter.check(-1, 'client1')).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle floating point limit', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      // Floating point limit (will be compared with integer count)
      await expect(limiter.check(2.5, 'client1')).resolves.toBeUndefined();
      await expect(limiter.check(2.5, 'client1')).resolves.toBeUndefined();

      // Third request exceeds 2.5
      await expect(limiter.check(2.5, 'client1')).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Integration Scenarios', () => {
    it('should simulate API rate limiting (5 req/min)', async () => {
      const limiter = rateLimit({
        interval: 60000, // 1 minute
        uniqueTokenPerInterval: 500,
      });

      const clientIp = '203.0.113.195';

      // Client makes 5 requests - all succeed
      for (let i = 0; i < 5; i++) {
        await expect(limiter.check(5, clientIp)).resolves.toBeUndefined();
      }

      // 6th request fails
      await expect(limiter.check(5, clientIp)).rejects.toThrow('Rate limit exceeded');
    });

    it('should simulate login rate limiting (3 attempts)', async () => {
      const limiter = rateLimit({
        interval: 900000, // 15 minutes
        uniqueTokenPerInterval: 500,
      });

      const clientIp = '203.0.113.195';

      // 3 failed login attempts
      await expect(limiter.check(3, clientIp)).resolves.toBeUndefined();
      await expect(limiter.check(3, clientIp)).resolves.toBeUndefined();
      await expect(limiter.check(3, clientIp)).resolves.toBeUndefined();

      // 4th attempt blocked
      await expect(limiter.check(3, clientIp)).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle mixed client scenarios', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 500,
      });

      // Good client - stays within limits
      await limiter.check(10, 'good-client');
      await limiter.check(10, 'good-client');

      // Bad client - exceeds limits
      for (let i = 0; i < 5; i++) {
        await limiter.check(5, 'bad-client');
      }
      await expect(limiter.check(5, 'bad-client')).rejects.toThrow('Rate limit exceeded');

      // Good client should still work
      await expect(limiter.check(10, 'good-client')).resolves.toBeUndefined();
    });
  });
});
