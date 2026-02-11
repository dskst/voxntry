import { describe, it, expect, vi } from 'vitest';
import {
  parseCommaSeparated,
  parseBoolean,
  formatBoolean,
  formatTimestampForSheets,
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
      expect(parseCommaSeparated('')).toBeUndefined();
    });

    it('should handle whitespace only', () => {
      expect(parseCommaSeparated('   ')).toBeUndefined();
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

  describe('formatTimestampForSheets', () => {
    it('should format timestamp in Asia/Tokyo timezone', () => {
      const date = new Date('2026-02-11T10:30:45.123Z'); // UTC time
      const formatted = formatTimestampForSheets(date, 'Asia/Tokyo');

      // UTC+9 hours = 19:30:45
      expect(formatted).toBe('2026-02-11 19:30:45');
    });

    it('should format timestamp in America/New_York timezone', () => {
      const date = new Date('2026-02-11T10:30:45.123Z'); // UTC time
      const formatted = formatTimestampForSheets(date, 'America/New_York');

      // UTC-5 hours (EST) = 05:30:45
      expect(formatted).toBe('2026-02-11 05:30:45');
    });

    it('should format timestamp in Europe/London timezone', () => {
      const date = new Date('2026-02-11T10:30:45.123Z'); // UTC time
      const formatted = formatTimestampForSheets(date, 'Europe/London');

      // UTC+0 hours (GMT) = 10:30:45
      expect(formatted).toBe('2026-02-11 10:30:45');
    });

    it('should default to Asia/Tokyo when timezone not specified', () => {
      const date = new Date('2026-02-11T10:30:45.123Z');
      const formatted = formatTimestampForSheets(date);

      expect(formatted).toBe('2026-02-11 19:30:45');
    });

    it('should format timestamp with correct date format YYYY-MM-DD HH:mm:ss', () => {
      const date = new Date('2026-01-05T03:05:09.000Z');
      const formatted = formatTimestampForSheets(date, 'Asia/Tokyo');

      // Should have leading zeros for single-digit months, days, hours, minutes, seconds
      expect(formatted).toBe('2026-01-05 12:05:09');
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should handle midnight correctly', () => {
      const date = new Date('2026-02-11T15:00:00.000Z'); // UTC midnight
      const formatted = formatTimestampForSheets(date, 'Asia/Tokyo');

      // UTC+9 hours = next day at 00:00:00
      expect(formatted).toBe('2026-02-12 00:00:00');
    });

    it('should handle year boundary correctly', () => {
      const date = new Date('2025-12-31T20:00:00.000Z');
      const formatted = formatTimestampForSheets(date, 'Asia/Tokyo');

      // UTC+9 hours = next year
      expect(formatted).toBe('2026-01-01 05:00:00');
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
        affiliationKana: 3,
        name: 4,
        nameKana: 5,
        items: 6,
        bodySize: 7,
        novelties: 8,
        memo: 9,
        checkedIn: 10,
        checkedInAt: 11,
        staffName: 12,
        attendsReception: 13,
      },
    };

    it('should map a complete row to attendee', () => {
      const row = [
        '001',
        'VIP',
        'ACME Corp',
        'エーシーエムイー',
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
        attributes: ['VIP'],
        affiliation: 'ACME Corp',
        affiliationKana: 'エーシーエムイー',
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
      const row = ['', '', 'Company', '', 'Name', '', '', '', '', '', 'FALSE', '', '', ''];

      const attendee = mapRowToAttendee(row, 5, mockConfig);

      expect(attendee).toMatchObject({
        id: 'row-7', // Fallback ID: index 5 + startRow 2
        affiliation: 'Company',
        name: 'Name',
        checkedIn: false,
      });
    });

    it('should handle missing columns gracefully', () => {
      const row = ['002', '', 'Corp', '', 'Jane Smith'];

      const attendee = mapRowToAttendee(row, 1, mockConfig);

      expect(attendee.id).toBe('002');
      expect(attendee.name).toBe('Jane Smith');
      expect(attendee.items).toEqual([]);
      expect(attendee.checkedIn).toBe(false);
    });

    it('should use fallback ID when id column is empty', () => {
      const row = ['', '', '', '', 'No ID User'];

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

      expect(attendee.affiliationKana).toBeUndefined();
      expect(attendee.attributes).toBeUndefined();
      expect(attendee.nameKana).toBeUndefined();
      expect(attendee.bodySize).toBeUndefined();
      expect(attendee.attendsReception).toBeUndefined();
    });

    it('should parse affiliationKana when column is configured', () => {
      const row = [
        '011',
        '',
        '株式会社テスト',
        'カブシキガイシャテスト',
        'テストユーザー',
        'テストユーザー',
        '',
        '',
        '',
        '',
        'FALSE',
        '',
        '',
        '',
      ];

      const attendee = mapRowToAttendee(row, 0, mockConfig);

      expect(attendee.affiliationKana).toBe('カブシキガイシャテスト');
    });

    it('should set affiliationKana to undefined when column is not configured', () => {
      const configWithoutAffiliationKana: SheetColumnMapping = {
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

      const row = ['012', 'Company', 'User', '', 'FALSE', '', ''];

      const attendee = mapRowToAttendee(row, 0, configWithoutAffiliationKana);

      expect(attendee.affiliationKana).toBeUndefined();
    });

    it('should parse comma-separated attributes', () => {
      const row = [
        '004',
        'Speaker,Sponsor',
        'Tech Corp',
        '',
        'Jane Smith',
        '',
        '',
        '',
        '',
        '',
        'FALSE',
        '',
        '',
        '',
      ];

      const attendee = mapRowToAttendee(row, 0, mockConfig);

      expect(attendee.attributes).toEqual(['Speaker', 'Sponsor']);
    });

    it('should parse full-width comma-separated attributes', () => {
      const row = [
        '005',
        '登壇者、スポンサー',
        'Japanese Corp',
        '',
        '田中太郎',
        '',
        '',
        '',
        '',
        '',
        'FALSE',
        '',
        '',
        '',
      ];

      const attendee = mapRowToAttendee(row, 0, mockConfig);

      expect(attendee.attributes).toEqual(['登壇者', 'スポンサー']);
    });

    it('should handle empty attribute string as undefined', () => {
      const row = [
        '006',
        '',
        'Corp',
        '',
        'No Attribute',
        '',
        '',
        '',
        '',
        '',
        'FALSE',
        '',
        '',
        '',
      ];

      const attendee = mapRowToAttendee(row, 0, mockConfig);

      expect(attendee.attributes).toBeUndefined();
    });

    it('should trim whitespace from attributes', () => {
      const row = [
        '007',
        ' Speaker , Sponsor , VIP ',
        'Corp',
        '',
        'User',
        '',
        '',
        '',
        '',
        '',
        'FALSE',
        '',
        '',
        '',
      ];

      const attendee = mapRowToAttendee(row, 0, mockConfig);

      expect(attendee.attributes).toEqual(['Speaker', 'Sponsor', 'VIP']);
    });

    it('should truncate attributes exceeding max limit of 5', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const row = [
        '008',
        'Speaker,Sponsor,VIP,Staff,Press,General', // 6 attributes - exceeds limit
        'Corp',
        '',
        'User',
        '',
        '',
        '',
        '',
        '',
        'FALSE',
        '',
        '',
        '',
      ];

      const attendee = mapRowToAttendee(row, 0, mockConfig);

      expect(attendee.attributes).toEqual(['Speaker', 'Sponsor', 'VIP', 'Staff', 'Press']);
      expect(attendee.attributes).toHaveLength(5);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should truncate attributes exceeding max character limit of 50', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const longAttribute = 'A'.repeat(60); // 60 characters - exceeds limit
      const row = [
        '009',
        longAttribute,
        'Corp',
        '',
        'User',
        '',
        '',
        '',
        '',
        '',
        'FALSE',
        '',
        '',
        '',
      ];

      const attendee = mapRowToAttendee(row, 0, mockConfig);

      expect(attendee.attributes).toBeDefined();
      expect(attendee.attributes![0]).toHaveLength(50);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle both max count and max length violations', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const longAttribute1 = 'A'.repeat(60);
      const longAttribute2 = 'B'.repeat(70);
      const row = [
        '010',
        `${longAttribute1},${longAttribute2},C,D,E,F`, // 6 attributes, first 2 too long
        'Corp',
        '',
        'User',
        '',
        '',
        '',
        '',
        '',
        'FALSE',
        '',
        '',
        '',
      ];

      const attendee = mapRowToAttendee(row, 0, mockConfig);

      expect(attendee.attributes).toBeDefined();
      expect(attendee.attributes).toHaveLength(5); // Max 5 attributes
      expect(attendee.attributes![0]).toHaveLength(50); // Truncated to 50
      expect(attendee.attributes![1]).toHaveLength(50); // Truncated to 50
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
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
