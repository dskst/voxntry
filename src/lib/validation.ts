import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

/**
 * Format Zod validation errors into a user-friendly format
 */
export function formatZodError(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

/**
 * Validate request body with Zod schema
 * Returns validated data or NextResponse with error
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data, error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: formatZodError(error),
          },
          { status: 400 }
        ),
      };
    }

    if (error instanceof SyntaxError) {
      return {
        data: null,
        error: NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        ),
      };
    }

    return {
      data: null,
      error: NextResponse.json(
        { error: 'Failed to parse request body' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validate FormData with Zod schema
 * Returns validated data or NextResponse with error
 */
export async function validateFormData<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const formData = await request.formData();
    const data: Record<string, Blob | string> = {};

    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    const validated = schema.parse(data);
    return { data: validated, error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: formatZodError(error),
          },
          { status: 400 }
        ),
      };
    }

    return {
      data: null,
      error: NextResponse.json(
        { error: 'Failed to parse form data' },
        { status: 400 }
      ),
    };
  }
}
