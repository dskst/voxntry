export interface Attendee {
  id: string;
  company: string;
  name: string;
  nameKana?: string; // Optional: for search
  itemsToHandOut: string;
  status: 'Checked In' | 'Not Checked In';
  timeStamp?: string;
  staffName?: string;
  tshirtSize?: string; // Optional: T-shirt size (S, M, L, XL, XXL, etc.)
  attendsReception?: string; // Optional: Reception attendance ("はい" | "いいえ" or "Yes" | "No")
}

export interface SheetColumnMapping {
  sheetName: string;
  startRow: number;
  columns: {
    id: number;
    company: number;
    name: number;
    itemsToHandOut: number;
    status: number;
    timeStamp: number;
    staffName: number;
    nameKana?: number; // Optional: Name in kana
    tshirtSize?: number; // Optional: T-shirt size column
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
