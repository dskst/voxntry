import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { GET } from '@/app/api/auth/verify/route';
import {
  createTestRequest,
  createAuthenticatedRequest,
  extractResponse,
} from '@/__tests__/helpers/api-test-utils';
import {
  VALID_JWT_TOKEN,
  INVALID_JWT_TOKEN,
  getValidTokenPayload,
} from '@/__tests__/helpers/fixtures/auth-tokens';
import type { AuthPayload } from '@/lib/jwt';

// Mock the JWT library to avoid jose/vitest compatibility issues
vi.mock('@/lib/jwt', () => ({
  verifyJWT: vi.fn(),
}));

describe('GET /api/auth/verify', () => {
  let mockVerifyJWT: Mock<[], Promise<AuthPayload | null>>;

  beforeEach(async () => {
    // Set JWT secret for token verification
    vi.stubEnv('JWT_SECRET', 'test-secret-at-least-32-chars-long-for-hs256-algorithm');

    // Get the mocked verifyJWT function
    const jwtModule = await import('@/lib/jwt');
    mockVerifyJWT = jwtModule.verifyJWT as Mock<[], Promise<AuthPayload | null>>;
    mockVerifyJWT.mockReset();
  });

  describe('Authentication validation', () => {
    it('should return 401 when no token provided', async () => {
      const request = createTestRequest({
        url: 'http://localhost:3000/api/auth/verify',
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({
        authenticated: false,
        error: 'No token provided',
      });
    });

    it('should return 401 for invalid token', async () => {
      // Mock verifyJWT to return null (invalid token)
      mockVerifyJWT.mockResolvedValue(null);

      const request = createAuthenticatedRequest({
        url: 'http://localhost:3000/api/auth/verify',
        token: INVALID_JWT_TOKEN,
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({
        authenticated: false,
        error: 'Invalid or expired token',
      });
    });

    it('should return 401 for malformed token', async () => {
      // Mock verifyJWT to return null (invalid token)
      mockVerifyJWT.mockResolvedValue(null);

      const request = createAuthenticatedRequest({
        url: 'http://localhost:3000/api/auth/verify',
        token: 'not-even-a-jwt',
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({
        authenticated: false,
        error: 'Invalid or expired token',
      });
    });

    it('should return 401 for empty token string', async () => {
      const request = createAuthenticatedRequest({
        url: 'http://localhost:3000/api/auth/verify',
        token: '',
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(401);
      expect(result.body.authenticated).toBe(false);
    });
  });

  describe('Successful authentication', () => {
    it('should return authenticated user data for valid token', async () => {
      // Mock verifyJWT to return valid payload
      mockVerifyJWT.mockResolvedValue(getValidTokenPayload());

      const request = createAuthenticatedRequest({
        url: 'http://localhost:3000/api/auth/verify',
        token: VALID_JWT_TOKEN,
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        authenticated: true,
        user: {
          conferenceId: 'test-conf-2026',
          staffName: 'Test Staff',
          role: 'staff',
        },
      });
    });

    it('should include all required user fields', async () => {
      // Mock verifyJWT to return valid payload
      mockVerifyJWT.mockResolvedValue(getValidTokenPayload());

      const request = createAuthenticatedRequest({
        url: 'http://localhost:3000/api/auth/verify',
        token: VALID_JWT_TOKEN,
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(200);
      expect(result.body.authenticated).toBe(true);
      expect(result.body.user).toHaveProperty('conferenceId');
      expect(result.body.user).toHaveProperty('staffName');
      expect(result.body.user).toHaveProperty('role');
    });

    it('should match expected payload structure', async () => {
      // Mock verifyJWT to return valid payload
      mockVerifyJWT.mockResolvedValue(getValidTokenPayload());

      const request = createAuthenticatedRequest({
        url: 'http://localhost:3000/api/auth/verify',
        token: VALID_JWT_TOKEN,
      });

      const response = await GET(request);
      const result = await extractResponse(response);
      const expectedPayload = getValidTokenPayload();

      expect(result.status).toBe(200);
      expect(result.body.user).toMatchObject(expectedPayload);
    });
  });

  describe('Cookie handling', () => {
    it('should read token from auth_token cookie', async () => {
      // Mock verifyJWT to return valid payload
      mockVerifyJWT.mockResolvedValue(getValidTokenPayload());

      const request = createTestRequest({
        url: 'http://localhost:3000/api/auth/verify',
        cookies: {
          auth_token: VALID_JWT_TOKEN,
        },
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(200);
      expect(result.body.authenticated).toBe(true);
    });

    it('should ignore other cookies', async () => {
      // Mock verifyJWT to return valid payload
      mockVerifyJWT.mockResolvedValue(getValidTokenPayload());

      const request = createTestRequest({
        url: 'http://localhost:3000/api/auth/verify',
        cookies: {
          auth_token: VALID_JWT_TOKEN,
          other_cookie: 'should-be-ignored',
          random_data: 'also-ignored',
        },
      });

      const response = await GET(request);
      const result = await extractResponse(response);

      expect(result.status).toBe(200);
      expect(result.body.authenticated).toBe(true);
    });
  });
});
