import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';
import { extractResponse } from '@/__tests__/helpers/api-test-utils';

describe('GET /api/health', () => {
  it('should return healthy status with correct structure', async () => {
    const response = await GET();
    const result = await extractResponse(response);

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      status: 'healthy',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      environment: expect.any(String),
    });
  });

  it('should return valid ISO timestamp', async () => {
    const response = await GET();
    const result = await extractResponse(response);

    const timestamp = result.body.timestamp;
    const date = new Date(timestamp);

    expect(date.toISOString()).toBe(timestamp);
    expect(isNaN(date.getTime())).toBe(false);
  });

  it('should return positive uptime', async () => {
    const response = await GET();
    const result = await extractResponse(response);

    expect(result.body.uptime).toBeGreaterThan(0);
  });

  it('should return environment from NODE_ENV', async () => {
    const response = await GET();
    const result = await extractResponse(response);

    expect(result.body.environment).toBeDefined();
    expect(typeof result.body.environment).toBe('string');
  });
});
