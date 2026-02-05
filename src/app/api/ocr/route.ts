import { NextResponse } from 'next/server';
import { getGoogleAuth } from '@/lib/google';
import { google } from 'googleapis';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

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
