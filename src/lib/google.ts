import { google } from 'googleapis';

export const getGoogleAuth = () => {
  // If running locally with GOOGLE_APPLICATION_CREDENTIALS set, this works automatically.
  // For Vercel/Cloud Run env vars:
  const credentials = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    project_id: process.env.GOOGLE_PROJECT_ID,
  };

  if (credentials.client_email && credentials.private_key) {
    return new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/cloud-platform'
      ],
    });
  }

  // Fallback to ADC
  return new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/cloud-platform'
    ],
  });
};
