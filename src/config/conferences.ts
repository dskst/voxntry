import { ConferenceConfig } from '@/types';

export const conferences: ConferenceConfig[] = [
  {
    id: 'demo-conf',
    name: 'Demo Conference 2025',
    password: 'password123', // Hardcoded for MVP as per plan
    spreadsheetId: process.env.NEXT_PUBLIC_DEMO_SPREADSHEET_ID || '',
  },
  // Add more conferences here
];

export const getConference = (id: string) => conferences.find(c => c.id === id);
