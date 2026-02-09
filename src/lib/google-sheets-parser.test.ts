import { describe, it, expect } from 'vitest';
import {
  parseCommaSeparated,
  parseBoolean,
  formatBoolean,
  getColumnLetter,
  mapRowToAttendee,
  calculateSheetRange,
  buildCellRange,
} from './google-sheets-parser';
import type { SheetColumnMapping } from '@/types';

describe('google-sheets-parser', () => {
  describe('parseCommaSeparated', () => {
    it('should parse comma-separated values', () => {
      expect(parseCommaSeparated('item1,item2,item3')).toEqual(['item1', 'item2', 'item3']);
    });

    it('should handle full-width commas', () => {
      expect(parseCommaSeparated('item1、item2、item3')).toEqual(['item1', 'item2', 'item3']);
    });

    it('should handle mixed comma types', () => {
      expect(parseCommaSeparated('item1、item2,item3')).toEqual(['item1', 'item2', 'item3']);
    });

    it('should trim whitespace', () => {
      expect(parseCommaSeparated('item1 , item2 , item3')).toEqual(['item1', 'item2', 'item3']);
    });

    it('should handle empty string', () => {
      expect(parseCommaSeparated('')).toEqual([]);
    });

    it('should handle whitespace only', () => {
      expect(parseCommaSeparated('   ')).toEqual([]);
    });

    it('should filter out empty items', () => {
      expect(parseCommaSeparated('item1,,item2')).toEqual(['item1', 'item2']);
    });
  });

  describe('parseBoolean', () => {
    it('should parse TRUE values', () => {
      expect(parseBoolean('TRUE')).toBe(true);
      expect(parseBoolean('True')).toBe(true);
      expect(parseBoolean('true')).toBe(true);
    });

    it('should parse YES values', () => {
      expect(parseBoolean('YES')).toBe(true);
      expect(parseBoolean('Yes')).toBe(true);
      expect(parseBoolean('yes')).toBe(true);
    });

    it('should parse Japanese affirmative', () => {
      expect(parseBoolean('はい')).toBe(true);
    });

    it('should parse special characters', () => {
      expect(parseBoolean('○')).toBe(true);
      expect(parseBoolean('1')).toBe(true);
    });

    it('should return false for FALSE values', () => {
      expect(parseBoolean('FALSE')).toBe(false);
      expect(parseBoolean('False')).toBe(false);
      expect(parseBoolean('false')).toBe(false);
    });

    it('should return false for NO values', () => {
      expect(parseBoolean('NO')).toBe(false);
      expect(parseBoolean('No')).toBe(false);
      expect(parseBoolean('no')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(parseBoolean(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(parseBoolean('')).toBe(false);
    });

    it('should return false for unrecognized values', () => {
      expect(parseBoolean('maybe')).toBe(false);
      expect(parseBoolean('0')).toBe(false);
    });

    it('should trim whitespace before checking', () => {
      expect(parseBoolean('  TRUE  ')).toBe(true);
      expect(parseBoolean('  FALSE  ')).toBe(false);
    });
  });

  describe('formatBoolean', () => {
    it('should format true as TRUE', () => {
      expect(formatBoolean(true)).toBe('TRUE');
    });

    it('should format false as FALSE', () => {
      expect(formatBoolean(false)).toBe('FALSE');
    });
  });

  describe('getColumnLetter', () => {
    it('should convert column indices to letters', () => {
      expect(getColumnLetter(0)).toBe('A');
      expect(getColumnLetter(1)).toBe('B');
      expect(getColumnLetter(25)).toBe('Z');
    });

    it('should handle double letter columns', () => {
      expect(getColumnLetter(26)).toBe('AA');
      expect(getColumnLetter(27)).toBe('AB');
      expect(getColumnLetter(51)).toBe('AZ');
    });

    it('should handle triple letter columns', () => {
      expect(getColumnLetter(702)).toBe('AAA');
    });
  });

  describe('mapRowToAttendee', () => {
    const mockConfig: SheetColumnMapping = {
      sheetName: 'Sheet1',
      startRow: 2,
      columns: {
        id: 0,
        attribute: 1,
        affiliation: 2,
        name: 3,
        nameKana: 4,
        items: 5,
        bodySize: 6,
        novelties: 7,
        memo: 8,
        checkedIn: 9,
        checkedInAt: 10,
        staffName: 11,
        attendsReception: 12,
      },
    };

    it('should map a complete row to attendee', () => {
      const row = [
        '001',
        'VIP',
        'ACME Corp',
        'John Doe',
        'ジョン・ドー',
        'item1,item2',
        'L',
        'novelty1',
        'Special guest',
        'TRUE',
        '2026-02-09T10:00:00Z',
        'Staff A',
        'TRUE',
      ];

      const attendee = mapRowToAttendee(row, 0, mockConfig);

      expect(attendee).toEqual({
        id: '001',
        attribute: 'VIP',
        affiliation: 'ACME Corp',
        name: 'John Doe',
        nameKana: 'ジョン・ドー',
        items: ['item1', 'item2'],
        bodySize: 'L',
        novelties: 'novelty1',
        memo: 'Special guest',
        checkedIn: true,
        checkedInAt: '2026-02-09T10:00:00Z',
        staffName: 'Staff A',
        attendsReception: true,
      });
    });

    it('should handle minimal row data', () => {
      const row = ['', '', 'Company', 'Name', '', '', '', '', '', 'FALSE', '', '', ''];

      const attendee = mapRowToAttendee(row, 5, mockConfig);

      expect(attendee).toMatchObject({
        id: 'row-7', // Fallback ID: index 5 + startRow 2
        affiliation: 'Company',
        name: 'Name',
        checkedIn: false,
      });
    });

    it('should handle missing columns gracefully', () => {
      const row = ['002', '', 'Corp', 'Jane Smith'];

      const attendee = mapRowToAttendee(row, 1, mockConfig);

      expect(attendee.id).toBe('002');
      expect(attendee.name).toBe('Jane Smith');
      expect(attendee.items).toEqual([]);
      expect(attendee.checkedIn).toBe(false);
    });

    it('should use fallback ID when id column is empty', () => {
      const row = ['', '', '', 'No ID User'];

      const attendee = mapRowToAttendee(row, 10, mockConfig);

      expect(attendee.id).toBe('row-12'); // index 10 + startRow 2
    });

    it('should handle optional columns as undefined', () => {
      const configWithoutOptional: SheetColumnMapping = {
        sheetName: 'Sheet1',
        startRow: 2,
        columns: {
          id: 0,
          affiliation: 1,
          name: 2,
          items: 3,
          checkedIn: 4,
          checkedInAt: 5,
          staffName: 6,
        },
      };

      const row = ['003', 'Company', 'User', '', 'FALSE', '', ''];

      const attendee = mapRowToAttendee(row, 0, configWithoutOptional);

      expect(attendee.attribute).toBeUndefined();
      expect(attendee.nameKana).toBeUndefined();
      expect(attendee.bodySize).toBeUndefined();
      expect(attendee.attendsReception).toBeUndefined();
    });
  });

  describe('calculateSheetRange', () => {
    it('should calculate range from config', () => {
      const config: SheetColumnMapping = {
        sheetName: 'MySheet',
        startRow: 5,
        columns: {
          id: 0,
          affiliation: 1,
          name: 2,
          items: 3,
          checkedIn: 4,
          checkedInAt: 5,
          staffName: 6,
        },
      };

      expect(calculateSheetRange(config)).toBe('MySheet!A5:ZZ');
    });

    it('should handle Japanese sheet names', () => {
      const config: SheetColumnMapping = {
        sheetName: 'シート1',
        startRow: 2,
        columns: {
          id: 0,
          affiliation: 1,
          name: 2,
          items: 3,
          checkedIn: 4,
          checkedInAt: 5,
          staffName: 6,
        },
      };

      expect(calculateSheetRange(config)).toBe('シート1!A2:ZZ');
    });
  });

  describe('buildCellRange', () => {
    it('should build cell range for single column and row', () => {
      expect(buildCellRange('Sheet1', 0, 5)).toBe('Sheet1!A5');
      expect(buildCellRange('Sheet1', 1, 10)).toBe('Sheet1!B10');
      expect(buildCellRange('Sheet1', 9, 2)).toBe('Sheet1!J2');
    });

    it('should handle double letter columns', () => {
      expect(buildCellRange('Sheet1', 26, 5)).toBe('Sheet1!AA5');
      expect(buildCellRange('Sheet1', 27, 10)).toBe('Sheet1!AB10');
    });

    it('should handle Japanese sheet names', () => {
      expect(buildCellRange('シート1', 0, 5)).toBe('シート1!A5');
    });
  });
});
