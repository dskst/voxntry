import { NextResponse } from 'next/server';
import { getGoogleAuth } from '@/lib/google';
import { google } from 'googleapis';
import { OcrRequestSchema } from '@/schemas/api';
import { validateFormData } from '@/lib/validation';

export async function POST(request: Request) {
  // Validate form data with Zod
  const { data, error } = await validateFormData(request, OcrRequestSchema);
  if (error) return error;

  const { image: file } = data;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const content = buffer.toString('base64');

    const auth = getGoogleAuth();
    const vision = google.vision({ version: 'v1', auth });

    const response = await vision.images.annotate({
      requestBody: {
        requests: [
          {
            image: { content },
            features: [{ type: 'TEXT_DETECTION' }],
          },
        ],
      },
    });

    const fullText = response.data.responses?.[0].fullTextAnnotation?.text;

    return NextResponse.json({ text: fullText || '' });
  } catch (error: any) {
    console.error('Vision API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
