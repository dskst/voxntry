import { google } from 'googleapis';

export const getGoogleAuth = () => {
  // Use GoogleAuth to automatically handle authentication:
  // 1. Checks GOOGLE_APPLICATION_CREDENTIALS env var (if key file is used)
  // 2. Checks Application Default Credentials (ADC) from 'gcloud auth application-default login'
  // 3. Checks GCE/Cloud Run Metadata Server (Managed Identity)
  return new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/cloud-platform'
    ],
  });
};

