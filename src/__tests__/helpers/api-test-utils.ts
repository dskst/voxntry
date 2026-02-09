/**
 * API Test Utilities
 *
 * Helper functions for testing Next.js API routes
 */

import { NextRequest } from 'next/server';

/**
 * Options for creating test requests
 */
export interface TestRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  url?: string;
}

/**
 * Create a NextRequest for testing API routes
 *
 * @example
 * const request = createTestRequest({
 *   method: 'POST',
 *   body: { username: 'test' },
 *   headers: { 'content-type': 'application/json' },
 *   cookies: { auth_token: 'token123' }
 * });
 */
export function createTestRequest(options: TestRequestOptions = {}): NextRequest {
  const {
    method = 'GET',
    body,
    headers = {},
    cookies = {},
    url = 'http://localhost:3000/api/test'
  } = options;

  // Build headers
  const requestHeaders = new Headers(headers);

  // Add cookies to header if provided
  if (Object.keys(cookies).length > 0) {
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    requestHeaders.set('cookie', cookieString);
  }

  // Add content-type for JSON bodies if not already set
  if (body && !requestHeaders.has('content-type')) {
    requestHeaders.set('content-type', 'application/json');
  }

  // Create request init object
  const init: RequestInit = {
    method,
    headers: requestHeaders,
  };

  // Add body if provided
  if (body) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(url, init);
}

/**
 * Extract response data from NextResponse
 *
 * @example
 * const response = await GET(request);
 * const { status, body, headers, cookies } = await extractResponse(response);
 */
export async function extractResponse(response: Response) {
  const body = await response.json().catch(() => null);

  return {
    status: response.status,
    statusText: response.statusText,
    body,
    headers: Object.fromEntries(response.headers.entries()),
    // Extract cookies from Set-Cookie header
    cookies: parseCookies(response.headers.get('set-cookie') || ''),
  };
}

/**
 * Parse cookies from Set-Cookie header
 */
function parseCookies(setCookieHeader: string): Record<string, string> {
  if (!setCookieHeader) return {};

  const cookies: Record<string, string> = {};

  // Set-Cookie can be a comma-separated list or a single value
  const cookieStrings = setCookieHeader.split(/,(?=[^;]+=[^;])/);

  cookieStrings.forEach(cookie => {
    const match = cookie.match(/^([^=]+)=([^;]+)/);
    if (match) {
      const [, name, value] = match;
      cookies[name.trim()] = value.trim();
    }
  });

  return cookies;
}

/**
 * Create a request with authentication
 *
 * @example
 * const request = createAuthenticatedRequest({
 *   method: 'POST',
 *   token: 'jwt-token-here',
 *   body: { rowId: '123' }
 * });
 */
export function createAuthenticatedRequest(
  options: TestRequestOptions & { token: string }
): NextRequest {
  const { token, ...restOptions } = options;

  return createTestRequest({
    ...restOptions,
    cookies: {
      ...restOptions.cookies,
      auth_token: token,
    },
  });
}

/**
 * Create a request with CSRF token
 *
 * @example
 * const request = createCsrfRequest({
 *   method: 'POST',
 *   csrfToken: 'csrf-token-here',
 *   body: { rowId: '123' }
 * });
 */
export function createCsrfRequest(
  options: TestRequestOptions & { csrfToken: string }
): NextRequest {
  const { csrfToken, ...restOptions } = options;

  return createTestRequest({
    ...restOptions,
    headers: {
      ...restOptions.headers,
      'x-csrf-token': csrfToken,
    },
    cookies: {
      ...restOptions.cookies,
      csrf_token: csrfToken,
    },
  });
}

/**
 * Create a fully authenticated request with CSRF
 *
 * @example
 * const request = createFullAuthRequest({
 *   method: 'POST',
 *   token: 'jwt-token',
 *   csrfToken: 'csrf-token',
 *   body: { rowId: '123' }
 * });
 */
export function createFullAuthRequest(
  options: TestRequestOptions & { token: string; csrfToken: string }
): NextRequest {
  const { token, csrfToken, ...restOptions } = options;

  return createTestRequest({
    ...restOptions,
    headers: {
      ...restOptions.headers,
      'x-csrf-token': csrfToken,
      'origin': 'http://localhost:3000',
      'host': 'localhost:3000',
    },
    cookies: {
      ...restOptions.cookies,
      auth_token: token,
      csrf_token: csrfToken,
    },
  });
}

/**
 * Assert response status and structure
 */
export function assertResponseStatus(
  response: { status: number; body: any },
  expectedStatus: number,
  expectedBodyKeys?: string[]
) {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}. Body: ${JSON.stringify(response.body)}`
    );
  }

  if (expectedBodyKeys) {
    const missingKeys = expectedBodyKeys.filter(key => !(key in response.body));
    if (missingKeys.length > 0) {
      throw new Error(
        `Missing expected keys in response body: ${missingKeys.join(', ')}`
      );
    }
  }
}
