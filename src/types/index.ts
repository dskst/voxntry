export interface Attendee {
  id: string;
  company: string;
  name: string;
  nameKana?: string; // Optional: for search
  itemsToHandOut: string;
  status: 'Checked In' | 'Not Checked In';
  timeStamp?: string;
  staffName?: string;
}

export interface ConferenceConfig {
  id: string;
  name: string;
  password: string;
  spreadsheetId: string;
}
