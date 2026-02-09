/**
 * Get CSRF token from cookies
 */
function getCsrfToken(): string {
  if (typeof document === 'undefined') {
    return '';
  }

  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : '';
}

/**
 * Common API request wrapper with CSRF protection
 * Automatically includes CSRF token in headers for state-changing requests
 */
export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const csrfToken = getCsrfToken();
  const headers = new Headers(options.headers);

  // Add CSRF token for state-changing operations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase() || 'GET')) {
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  // Set default Content-Type if not provided
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers,
  });
}

/**
 * Convenience methods for common HTTP operations
 */
export const api = {
  get: (url: string, options?: RequestInit) =>
    apiRequest(url, { ...options, method: 'GET' }),

  post: (url: string, data?: unknown, options?: RequestInit) =>
    apiRequest(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: (url: string, data?: unknown, options?: RequestInit) =>
    apiRequest(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: (url: string, options?: RequestInit) =>
    apiRequest(url, { ...options, method: 'DELETE' }),
};
