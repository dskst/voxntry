import { vi } from 'vitest';

/**
 * Helper to create mock Next.js Request objects
 */
export function createMockRequest(
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
    cookies?: Record<string, string>;
  } = {}
): Request {
  const {
    method = 'GET',
    url = 'http://localhost:3000',
    headers = {},
    body,
    cookies = {},
  } = options;

  const mockHeaders = new Headers(headers);

  // Add cookies to headers
  if (Object.keys(cookies).length > 0) {
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    mockHeaders.set('cookie', cookieString);
  }

  const requestInit: RequestInit = {
    method,
    headers: mockHeaders,
  };

  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    requestInit.body = JSON.stringify(body);
    mockHeaders.set('content-type', 'application/json');
  }

  return new Request(url, requestInit);
}

/**
 * Helper to create mock Response objects
 */
export function createMockResponse(
  body: unknown,
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {}
): Response {
  const { status = 200, statusText = 'OK', headers = {} } = options;

  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Helper to mock Next.js cookies
 */
export function mockCookies(cookieMap: Record<string, string> = {}) {
  return {
    get: vi.fn((name: string) => ({
      name,
      value: cookieMap[name] || '',
    })),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn((name: string) => name in cookieMap),
    getAll: vi.fn(() =>
      Object.entries(cookieMap).map(([name, value]) => ({ name, value }))
    ),
  };
}

/**
 * Helper to mock Next.js headers
 */
export function mockHeaders(headerMap: Record<string, string> = {}) {
  return {
    get: vi.fn((name: string) => headerMap[name.toLowerCase()] || null),
    has: vi.fn((name: string) => name.toLowerCase() in headerMap),
    forEach: vi.fn((callback: (value: string, key: string) => void) => {
      Object.entries(headerMap).forEach(([key, value]) => callback(value, key));
    }),
  };
}
