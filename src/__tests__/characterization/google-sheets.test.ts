import { describe, it, expect } from 'vitest';
import {
  parseCommaSeparated,
  parseBoolean,
  formatBoolean,
  getColumnLetter,
  mapRowToAttendee
} from '@/lib/google-sheets-parser';
import type { SheetColumnMapping } from '@/types';

/**
 * Characterization Tests for google-sheets-parser
 *
 * Purpose: Verify current parsing behavior
 * These are pure functions - no mocking needed
 */

describe('google-sheets-parser - Characterization Tests', () => {
  const mockConfig: SheetColumnMapping = {
    sheetName: 'TestSheet',
    startRow: 2,
    columns: {
      id: 0,
      affiliation: 1,
      name: 2,
      items: 3,
      checkedIn: 4,
      checkedInAt: 5,
      staffName: 6
    }
  };

  describe('parseCommaSeparated', () => {
    it('should parse comma-separated string', () => {
      expect(parseCommaSeparated('Badge,Tshirt,Bag')).toEqual(['Badge', 'Tshirt', 'Bag']);
    });

    it('should handle empty string', () => {
      expect(parseCommaSeparated('')).toEqual([]);
    });

    it('should trim whitespace', () => {
      expect(parseCommaSeparated(' Badge , Tshirt , Bag ')).toEqual(['Badge', 'Tshirt', 'Bag']);
    });

    it('should handle full-width comma', () => {
      expect(parseCommaSeparated('Badge、Tshirt、Bag')).toEqual(['Badge', 'Tshirt', 'Bag']);
    });
  });

  describe('parseBoolean', () => {
    it('should parse TRUE as true', () => {
      expect(parseBoolean('TRUE')).toBe(true);
      expect(parseBoolean('True')).toBe(true);
      expect(parseBoolean('true')).toBe(true);
    });

    it('should parse Japanese はい as true', () => {
      expect(parseBoolean('はい')).toBe(true);
    });

    it('should parse ○ as true', () => {
      expect(parseBoolean('○')).toBe(true);
    });

    it('should return false for undefined', () => {
      expect(parseBoolean(undefined)).toBe(false);
    });

    it('should return false for FALSE', () => {
      expect(parseBoolean('FALSE')).toBe(false);
      expect(parseBoolean('false')).toBe(false);
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
    it('should convert 0 to A', () => {
      expect(getColumnLetter(0)).toBe('A');
    });

    it('should convert 25 to Z', () => {
      expect(getColumnLetter(25)).toBe('Z');
    });

    it('should convert 26 to AA', () => {
      expect(getColumnLetter(26)).toBe('AA');
    });
  });

  describe('mapRowToAttendee', () => {
    it('should map a basic row to attendee object', () => {
      const row = ['001', 'Test Corp', 'John Doe', 'Badge,Tshirt', 'FALSE', '', ''];

      const attendee = mapRowToAttendee(row, 0, mockConfig);

      expect(attendee.id).toBe('001');
      expect(attendee.affiliation).toBe('Test Corp');
      expect(attendee.name).toBe('John Doe');
      expect(attendee.items).toEqual(['Badge', 'Tshirt']);
      expect(attendee.checkedIn).toBe(false);
    });

    it('should parse boolean TRUE values', () => {
      const row = ['001', 'Test Corp', 'John Doe', '', 'TRUE', '2026-01-01', 'Staff'];

      const attendee = mapRowToAttendee(row, 0, mockConfig);

      expect(attendee.checkedIn).toBe(true);
      expect(attendee.checkedInAt).toBe('2026-01-01');
      expect(attendee.staffName).toBe('Staff');
    });

    it('should generate fallback ID if missing', () => {
      const row = ['', 'Test Corp', 'John Doe', '', 'FALSE', '', ''];

      const attendee = mapRowToAttendee(row, 5, mockConfig);

      // Should generate ID based on row index (5 + startRow 2 = 7)
      expect(attendee.id).toBe('row-7');
    });
  });
});
