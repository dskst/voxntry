import { NextResponse } from 'next/server';
import { getGoogleAuth } from '@/lib/google';
import { google } from 'googleapis';
import { TranscribeRequestSchema } from '@/schemas/api';
import { validateFormData } from '@/lib/validation';

export async function POST(request: Request) {
  // Validate form data with Zod
  const { data, error } = await validateFormData(request, TranscribeRequestSchema);
  if (error) return error;

  const { audio: file } = data;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const content = buffer.toString('base64');

    const auth = getGoogleAuth();
    const speech = google.speech({ version: 'v1', auth });

    const requestBody = {
      audio: {
        content,
      },
      config: {
        encoding: 'WEBM_OPUS' as const, // WebM from MediaRecorder
        sampleRateHertz: 48000,
        languageCode: 'ja-JP',
        model: 'default',
      },
    };

    const response = await speech.speech.recognize({
      requestBody,
    });

    const results = response.data.results;
    const transcription = results
      ?.map((result) => result.alternatives?.[0].transcript)
      .join('\n');

    return NextResponse.json({ transcript: transcription || '' });
  } catch (error: any) {
    console.error('Speech API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
