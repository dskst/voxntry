import { ConferenceConfig } from '@/types';

export const conferences: ConferenceConfig[] = [
  {
    id: 'demo-conf',
    name: 'Demo Conference 2025',
    password: process.env.CONFERENCE_DEMO_CONF_PASSWORD || 'password123', // Fallback for backward compatibility
    spreadsheetId: process.env.NEXT_PUBLIC_DEMO_SPREADSHEET_ID || '',
    sheetConfig: {
      sheetName: 'シート1',
      startRow: 2,
      columns: {
        id: 0,
        company: 1,
        name: 2,
        itemsToHandOut: 3,
        status: 4,
        timeStamp: 5,
        staffName: 6,
        nameKana: 7,
        tshirtSize: 8,
        attendsReception: 9,
      },
    },
  },
  // Add more conferences here
];

export const getConference = (id: string) => conferences.find(c => c.id === id);
