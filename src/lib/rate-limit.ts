import { LRUCache } from 'lru-cache';

export interface RateLimitOptions {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Maximum number of unique tokens to track
}

export interface RateLimiter {
  check: (limit: number, token: string) => Promise<void>;
  reset: (token: string) => void;
}

/**
 * Create a rate limiter using LRU cache
 *
 * @param options - Rate limit configuration
 * @returns Rate limiter instance
 *
 * @example
 * ```typescript
 * const limiter = rateLimit({
 *   interval: 60 * 1000, // 1 minute
 *   uniqueTokenPerInterval: 500,
 * });
 *
 * // Check if request is within limit
 * try {
 *   await limiter.check(5, clientIp); // 5 requests per interval
 * } catch {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * }
 * ```
 */
export function rateLimit(options: RateLimitOptions): RateLimiter {
  const tokenCache = new LRUCache<string, number[]>({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000,
  });

  return {
    /**
     * Check if the request is within the rate limit
     * @param limit - Maximum number of requests allowed in the interval
     * @param token - Unique identifier for the client (e.g., IP address)
     * @throws Error if rate limit is exceeded
     */
    check: async (limit: number, token: string): Promise<void> => {
      const tokenCount = tokenCache.get(token) || [0];

      if (tokenCount[0] === 0) {
        tokenCache.set(token, tokenCount);
      }

      tokenCount[0] += 1;

      const currentUsage = tokenCount[0];
      const isRateLimited = currentUsage > limit;

      if (isRateLimited) {
        throw new Error('Rate limit exceeded');
      }
    },

    /**
     * Reset the rate limit counter for a specific token
     * Useful for testing or manual override
     * @param token - Unique identifier to reset
     */
    reset: (token: string): void => {
      tokenCache.delete(token);
    },
  };
}

/**
 * Get client IP address from request headers
 * Handles various proxy configurations
 */
export function getClientIp(request: Request): string {
  // Check X-Forwarded-For header (common in proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  // Check X-Real-IP header (used by some proxies)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Check CF-Connecting-IP (Cloudflare)
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }

  // Fallback to unknown if no IP is found
  // In production, this should rarely happen
  return 'unknown';
}
