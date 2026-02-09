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
        attribute: 1,          // New: Attendee type (Speaker, Sponsor, etc.)
        affiliation: 2,        // Changed from 'company'
        name: 3,
        nameKana: 4,
        items: 5,              // Changed from 'itemsToHandOut'
        bodySize: 6,           // Changed from 'tshirtSize' (index 8 → 6)
        novelties: 7,          // New: Additional novelty items
        memo: 8,               // New: Staff notes
        attendsReception: 9,  // Moved from index 9 → 12 (kept from original)
        checkedIn: 10,          // Changed from 'status' (index 4 → 9)
        checkedInAt: 11,       // Changed from 'timeStamp' (index 5 → 10)
        staffName: 12,         // Moved from index 6 → 11
      },
    },
  },
  // Add more conferences here
];

export const getConference = (id: string) => conferences.find(c => c.id === id);
