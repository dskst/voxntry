import { NextResponse } from 'next/server';

/**
 * Health check endpoint for container orchestration (Cloud Run, Kubernetes, etc.)
 * Used by Docker HEALTHCHECK and load balancers
 */
export async function GET() {
  try {
    // Basic health check - can be extended with database/service checks
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
