export interface Attendee {
  id: string;
  affiliation: string; // Changed from 'company' - more inclusive term for organizations, universities, freelancers, etc.
  attributes?: string[]; // Optional: Array of attendee types (Speaker, Sponsor, Staff, Press, General, VIP) - max 5 items
  name: string;
  nameKana?: string; // Optional: for search
  items: string[]; // Changed from 'itemsToHandOut' - parsed from comma-separated string
  bodySize?: string; // Changed from 'tshirtSize' - more generic for any apparel (S, M, L, XL, XXL, etc.)
  novelties?: string; // Optional: Additional novelty items (comma-separated in sheet, but as string here)
  memo?: string; // Optional: Staff notes for special requirements (wheelchair, allergies, VIP handling, etc.)
  attendsReception?: boolean; // Changed from string to boolean - Reception attendance
  checkedIn: boolean; // Changed from 'status' - simplified to boolean
  checkedInAt?: string; // Changed from 'timeStamp' - more descriptive name
  staffName?: string;
}

export interface SheetColumnMapping {
  sheetName: string;
  startRow: number;
  columns: {
    id: number;
    affiliation: number; // Changed from 'company'
    attribute?: number; // Optional: Attendee type column
    name: number;
    items: number; // Changed from 'itemsToHandOut'
    checkedIn: number; // Changed from 'status'
    checkedInAt: number; // Changed from 'timeStamp'
    staffName: number;
    nameKana?: number; // Optional: Name in kana
    bodySize?: number; // Changed from 'tshirtSize' - Optional: Body size column
    novelties?: number; // Optional: Additional novelty items column
    memo?: number; // Optional: Staff memo column
    attendsReception?: number; // Optional: Reception attendance column
  };
}

export interface ConferenceConfig {
  id: string;
  name: string;
  password: string;
  spreadsheetId: string;
  sheetConfig?: SheetColumnMapping;
}
