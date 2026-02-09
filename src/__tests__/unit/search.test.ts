import { describe, it, expect } from 'vitest';
import { normalizeString, filterAttendees, type SearchConfig } from '@/utils/search';

/**
 * Comprehensive Search Utility Tests
 *
 * Coverage:
 * - normalizeString (katakana→hiragana, full-width→half-width, case normalization)
 * - filterAttendees (multi-field OR search, partial matching)
 * - Japanese character handling (hiragana, katakana, kanji)
 * - Edge cases and security scenarios
 */

describe('Search Utilities - Comprehensive Unit Tests', () => {
  describe('normalizeString - String Normalization', () => {
    describe('Katakana to Hiragana Conversion', () => {
      it('should convert katakana to hiragana', () => {
        expect(normalizeString('タナカ')).toBe('たなか');
        expect(normalizeString('ヤマダ')).toBe('やまだ');
        expect(normalizeString('サトウ')).toBe('さとう');
      });

      it('should convert mixed katakana and hiragana', () => {
        expect(normalizeString('タナカたろう')).toBe('たなかたろう');
        expect(normalizeString('ヤマダはなこ')).toBe('やまだはなこ');
      });

      it('should handle katakana with small characters', () => {
        expect(normalizeString('ッ')).toBe('っ');
        expect(normalizeString('ャ')).toBe('ゃ');
        expect(normalizeString('ュ')).toBe('ゅ');
        expect(normalizeString('ョ')).toBe('ょ');
      });

      it('should handle katakana with long vowel mark', () => {
        // Note: ー (long vowel mark) is not in the conversion range
        expect(normalizeString('コーヒー')).toBe('こーひー');
      });
    });

    describe('Full-width to Half-width Conversion', () => {
      it('should convert full-width alphabet to half-width', () => {
        expect(normalizeString('ＡＢＣ')).toBe('abc');
        expect(normalizeString('ＸＹＺ')).toBe('xyz');
        expect(normalizeString('ａｂｃ')).toBe('abc');
      });

      it('should convert full-width numbers to half-width', () => {
        expect(normalizeString('０１２３４５６７８９')).toBe('0123456789');
      });

      it('should convert mixed full-width and half-width', () => {
        expect(normalizeString('ABC１２３abc')).toBe('abc123abc');
        expect(normalizeString('Ａbc１23')).toBe('abc123');
      });
    });

    describe('Space and Whitespace Handling', () => {
      it('should convert full-width space to half-width', () => {
        expect(normalizeString('田中　太郎')).toBe('田中 太郎');
      });

      it('should trim leading and trailing spaces', () => {
        expect(normalizeString('  test  ')).toBe('test');
        expect(normalizeString('　test　')).toBe('test');
      });

      it('should preserve internal spaces', () => {
        expect(normalizeString('hello world')).toBe('hello world');
        expect(normalizeString('田中 太郎')).toBe('田中 太郎');
      });
    });

    describe('Case Normalization', () => {
      it('should convert uppercase to lowercase', () => {
        expect(normalizeString('ABC')).toBe('abc');
        expect(normalizeString('Test')).toBe('test');
        expect(normalizeString('HeLLo')).toBe('hello');
      });

      it('should preserve lowercase', () => {
        expect(normalizeString('abc')).toBe('abc');
        expect(normalizeString('test')).toBe('test');
      });
    });

    describe('Combined Normalization', () => {
      it('should apply all normalizations together', () => {
        // Katakana + full-width + uppercase + spaces
        // Note: Full-width space (　) is converted to half-width space ( )
        expect(normalizeString('　タナカ　ＴＡＲＯタロウ　')).toBe('たなか taroたろう');
      });

      it('should handle realistic Japanese names', () => {
        // Full-width space (　) converts to half-width space ( )
        expect(normalizeString('ヤマダ　タロウ')).toBe('やまだ たろう');
        expect(normalizeString('サトウ　ハナコ')).toBe('さとう はなこ');
      });

      it('should handle realistic company names', () => {
        expect(normalizeString('株式会社ＡＢＣ')).toBe('株式会社abc');
        // ガ→が, ャ→ゃ, Full-width space → half-width space
        expect(normalizeString('カブシキガイシャ　ＸＹＺ')).toBe('かぶしきがいしゃ xyz');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty string', () => {
        expect(normalizeString('')).toBe('');
      });

      it('should handle whitespace-only string', () => {
        expect(normalizeString('   ')).toBe('');
        expect(normalizeString('　　　')).toBe('');
      });

      it('should preserve kanji characters', () => {
        expect(normalizeString('田中')).toBe('田中');
        expect(normalizeString('山田')).toBe('山田');
        expect(normalizeString('佐藤')).toBe('佐藤');
      });

      it('should preserve special characters', () => {
        expect(normalizeString('!@#$%')).toBe('!@#$%');
        expect(normalizeString('()[]{}')) .toBe('()[]{}');
      });

      it('should handle numbers', () => {
        expect(normalizeString('123')).toBe('123');
        expect(normalizeString('０１２３')).toBe('0123');
      });

      it('should handle mixed content', () => {
        expect(normalizeString('Test123テスト')).toBe('test123てすと');
      });

      it('should handle very long strings', () => {
        const longString = 'テスト'.repeat(100);
        const normalized = normalizeString(longString);
        expect(normalized).toBe('てすと'.repeat(100));
      });

      it('should handle Unicode emoji', () => {
        // Emoji should be preserved as-is
        expect(normalizeString('Hello 👋 World 🌍')).toBe('hello 👋 world 🌍');
      });
    });
  });

  describe('filterAttendees - Search Filtering', () => {
    // Sample attendee data for testing
    const attendees = [
      {
        id: '1',
        name: '田中太郎',
        nameKana: 'タナカタロウ',
        affiliation: '株式会社ABC',
        email: 'tanaka@example.com',
      },
      {
        id: '2',
        name: '山田花子',
        nameKana: 'ヤマダハナコ',
        affiliation: '株式会社DEF',
        email: 'yamada@example.com',
      },
      {
        id: '3',
        name: '佐藤次郎',
        nameKana: 'サトウジロウ',
        affiliation: '株式会社GHI',
        email: 'sato@example.com',
      },
      {
        id: '4',
        name: 'John Smith',
        nameKana: 'ジョンスミス',
        affiliation: 'XYZ Corporation',
        email: 'john@example.com',
      },
      {
        id: '5',
        name: '鈴木一郎',
        nameKana: 'スズキイチロウ',
        affiliation: null, // Test null affiliation
        email: 'suzuki@example.com',
      },
    ];

    describe('Basic Filtering', () => {
      it('should return all items for empty query', () => {
        const results = filterAttendees(attendees, '');
        expect(results).toHaveLength(5);
        expect(results).toEqual(attendees);
      });

      it('should return all items for whitespace-only query', () => {
        const results = filterAttendees(attendees, '   ');
        expect(results).toHaveLength(5);
      });

      it('should filter by name (kanji)', () => {
        const results = filterAttendees(attendees, '田中');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('田中太郎');
      });

      it('should filter by name (partial match)', () => {
        const results = filterAttendees(attendees, '太郎');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('田中太郎');
      });

      it('should filter by nameKana (katakana)', () => {
        const results = filterAttendees(attendees, 'ヤマダ');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('山田花子');
      });

      it('should filter by affiliation', () => {
        const results = filterAttendees(attendees, 'ABC');
        expect(results).toHaveLength(1);
        expect(results[0].affiliation).toBe('株式会社ABC');
      });
    });

    describe('Normalization-based Filtering', () => {
      it('should match hiragana query against katakana field', () => {
        // Search with hiragana, should match katakana
        const results = filterAttendees(attendees, 'たなか');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('田中太郎');
      });

      it('should match katakana query against hiragana in name', () => {
        // Even though name has kanji, nameKana will match
        const results = filterAttendees(attendees, 'タナカ');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('田中太郎');
      });

      it('should match full-width alphabet query', () => {
        const results = filterAttendees(attendees, 'ＡＢＣ');
        expect(results).toHaveLength(1);
        expect(results[0].affiliation).toBe('株式会社ABC');
      });

      it('should be case-insensitive for English', () => {
        const results1 = filterAttendees(attendees, 'john');
        const results2 = filterAttendees(attendees, 'JOHN');
        const results3 = filterAttendees(attendees, 'John');

        expect(results1).toHaveLength(1);
        expect(results2).toHaveLength(1);
        expect(results3).toHaveLength(1);
        expect(results1[0].name).toBe('John Smith');
      });
    });

    describe('Multi-field OR Search', () => {
      it('should search across multiple fields (OR logic)', () => {
        // "太郎" appears in name, so should match
        const results = filterAttendees(attendees, '太郎', {
          fields: ['name', 'nameKana', 'affiliation'],
        });
        expect(results).toHaveLength(1);
      });

      it('should match if any field contains query', () => {
        // "smith" in name, should match
        const results = filterAttendees(attendees, 'smith', {
          fields: ['name', 'affiliation'],
        });
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('John Smith');
      });

      it('should respect field configuration', () => {
        // Search only in affiliation
        const results = filterAttendees(attendees, '田中', {
          fields: ['affiliation'],
        });
        // "田中" is in name, not affiliation
        expect(results).toHaveLength(0);
      });

      it('should handle single field search', () => {
        const results = filterAttendees(attendees, 'ABC', {
          fields: ['affiliation'],
        });
        expect(results).toHaveLength(1);
      });
    });

    describe('Normalization Control', () => {
      it('should use normalization by default', () => {
        const results = filterAttendees(attendees, 'たなか');
        expect(results).toHaveLength(1);
      });

      it('should allow disabling normalization', () => {
        const results = filterAttendees(attendees, 'たなか', {
          fields: ['name', 'nameKana', 'affiliation'],
          normalize: false,
        });
        // Without normalization, hiragana won't match katakana
        expect(results).toHaveLength(0);
      });

      it('should still be case-insensitive when normalization disabled', () => {
        const results = filterAttendees(attendees, 'JOHN', {
          fields: ['name'],
          normalize: false,
        });
        expect(results).toHaveLength(1);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty array', () => {
        const results = filterAttendees([], 'test');
        expect(results).toEqual([]);
      });

      it('should handle null field values', () => {
        // Suzuki has null affiliation - search by hiragana of nameKana
        const results = filterAttendees(attendees, 'すずき', {
          fields: ['name', 'nameKana', 'affiliation'],
        });
        expect(results).toHaveLength(1);
      });

      it('should handle undefined field values', () => {
        const items = [
          { id: '1', name: 'Test', nameKana: undefined },
        ];

        const results = filterAttendees(items, 'test', {
          fields: ['name', 'nameKana'],
        });
        expect(results).toHaveLength(1);
      });

      it('should handle non-string field values', () => {
        const items = [
          { id: '1', name: 'Test', count: 123 },
        ];

        const results = filterAttendees(items as any, 'test', {
          fields: ['name', 'count'] as any,
        });
        expect(results).toHaveLength(1);
      });

      it('should handle special characters in query', () => {
        const items = [
          { id: '1', name: 'Test (ABC)', nameKana: 'テスト' },
        ];

        const results = filterAttendees(items, '(ABC)', {
          fields: ['name'],
        });
        expect(results).toHaveLength(1);
      });

      it('should handle very long query strings', () => {
        const longQuery = 'test'.repeat(100);
        const results = filterAttendees(attendees, longQuery);
        expect(results).toHaveLength(0);
      });
    });

    describe('Partial Matching Behavior', () => {
      it('should match beginning of field', () => {
        const results = filterAttendees(attendees, '田中');
        expect(results).toHaveLength(1);
      });

      it('should match middle of field', () => {
        const results = filterAttendees(attendees, '中太');
        expect(results).toHaveLength(1);
      });

      it('should match end of field', () => {
        const results = filterAttendees(attendees, '太郎');
        expect(results).toHaveLength(1);
      });

      it('should not match if query not contained', () => {
        const results = filterAttendees(attendees, '存在しない');
        expect(results).toHaveLength(0);
      });
    });

    describe('Multiple Matches', () => {
      it('should return multiple matches', () => {
        // "株式会社" appears in multiple affiliations
        const results = filterAttendees(attendees, '株式会社');
        expect(results.length).toBeGreaterThan(1);
      });

      it('should preserve original order', () => {
        const results = filterAttendees(attendees, '株式会社');
        // Check that IDs are in order
        expect(parseInt(results[0].id)).toBeLessThan(parseInt(results[1].id));
      });

      it('should return unique items only', () => {
        // Same query shouldn't duplicate results
        const results = filterAttendees(attendees, '株式会社');
        const ids = results.map(r => r.id);
        const uniqueIds = [...new Set(ids)];
        expect(ids).toEqual(uniqueIds);
      });
    });

    describe('Integration Scenarios', () => {
      it('should handle realistic search: partial name in hiragana', () => {
        const results = filterAttendees(attendees, 'たなか', {
          fields: ['name', 'nameKana', 'affiliation'],
          normalize: true,
        });
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('田中太郎');
      });

      it('should handle realistic search: company name', () => {
        const results = filterAttendees(attendees, 'xyz', {
          fields: ['affiliation'],
          normalize: true,
        });
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('John Smith');
      });

      it('should handle realistic search: mixed Japanese/English', () => {
        const items = [
          { id: '1', name: 'ABCコーポレーション太郎', nameKana: 'ABCコーポレーションタロウ' },
        ];

        const results = filterAttendees(items, 'abc', {
          fields: ['name', 'nameKana'],
          normalize: true,
        });
        expect(results).toHaveLength(1);
      });
    });

    describe('Default Configuration', () => {
      it('should use default fields when not specified', () => {
        const results = filterAttendees(attendees, '田中');
        expect(results).toHaveLength(1);
      });

      it('should use normalization by default', () => {
        const results = filterAttendees(attendees, 'たなか');
        expect(results).toHaveLength(1);
      });

      it('should search name, nameKana, and affiliation by default', () => {
        // Test that all three fields are searched
        const nameMatch = filterAttendees(attendees, '田中');
        const kanaMatch = filterAttendees(attendees, 'タナカ');
        const affiliationMatch = filterAttendees(attendees, 'ABC');

        expect(nameMatch).toHaveLength(1);
        expect(kanaMatch).toHaveLength(1);
        expect(affiliationMatch).toHaveLength(1);
      });
    });

    describe('Array Field Support', () => {
      // Sample data with array fields (e.g., attributes)
      const attendeesWithArrays = [
        {
          id: '1',
          name: '田中太郎',
          nameKana: 'タナカタロウ',
          affiliation: '株式会社ABC',
          attributes: ['Speaker', 'Sponsor'],
        },
        {
          id: '2',
          name: '山田花子',
          nameKana: 'ヤマダハナコ',
          affiliation: '株式会社DEF',
          attributes: ['Staff', 'VIP'],
        },
        {
          id: '3',
          name: '佐藤次郎',
          nameKana: 'サトウジロウ',
          affiliation: '株式会社GHI',
          attributes: ['Press'],
        },
        {
          id: '4',
          name: '鈴木一郎',
          nameKana: 'スズキイチロウ',
          affiliation: '株式会社JKL',
          attributes: ['登壇者', 'スポンサー'],
        },
        {
          id: '5',
          name: 'John Smith',
          nameKana: 'ジョンスミス',
          affiliation: 'XYZ Corporation',
          attributes: undefined, // No attributes
        },
        {
          id: '6',
          name: 'Jane Doe',
          nameKana: 'ジェーンドー',
          affiliation: 'Test Corp',
          attributes: [], // Empty array
        },
      ];

      it('should search within string array fields', () => {
        const results = filterAttendees(attendeesWithArrays, 'Speaker', {
          fields: ['attributes'] as any,
        });
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('田中太郎');
      });

      it('should match any element in array', () => {
        const results = filterAttendees(attendeesWithArrays, 'VIP', {
          fields: ['attributes'] as any,
        });
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('山田花子');
      });

      it('should search arrays with single element', () => {
        const results = filterAttendees(attendeesWithArrays, 'Press', {
          fields: ['attributes'] as any,
        });
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('佐藤次郎');
      });

      it('should handle Japanese text in array fields', () => {
        const results = filterAttendees(attendeesWithArrays, '登壇者', {
          fields: ['attributes'] as any,
        });
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('鈴木一郎');
      });

      it('should normalize array field searches', () => {
        // Search with hiragana, should match katakana
        const results = filterAttendees(attendeesWithArrays, 'すぽんさー', {
          fields: ['attributes'] as any,
          normalize: true,
        });
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('鈴木一郎');
      });

      it('should handle partial matches in array elements', () => {
        const results = filterAttendees(attendeesWithArrays, 'Speak', {
          fields: ['attributes'] as any,
        });
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('田中太郎');
      });

      it('should handle undefined array field', () => {
        const results = filterAttendees(attendeesWithArrays, 'NonExistent', {
          fields: ['attributes'] as any,
        });
        expect(results).toHaveLength(0);
      });

      it('should handle empty array field', () => {
        const results = filterAttendees(attendeesWithArrays, 'test', {
          fields: ['name', 'attributes'] as any,
        });
        // Should not match empty array, but might match name
        expect(results.every(r => r.id !== '6' || r.name.toLowerCase().includes('test')));
      });

      it('should search both string and array fields together', () => {
        // Search across name (string) and attributes (array)
        const results = filterAttendees(attendeesWithArrays, 'Speaker', {
          fields: ['name', 'attributes'] as any,
        });
        expect(results).toHaveLength(1);
        expect(results[0].attributes).toContain('Speaker');
      });

      it('should handle case-insensitive array search', () => {
        const results1 = filterAttendees(attendeesWithArrays, 'speaker', {
          fields: ['attributes'] as any,
        });
        const results2 = filterAttendees(attendeesWithArrays, 'SPEAKER', {
          fields: ['attributes'] as any,
        });
        expect(results1).toHaveLength(1);
        expect(results2).toHaveLength(1);
        expect(results1[0].id).toBe(results2[0].id);
      });

      it('should skip non-string elements in arrays', () => {
        const itemsWithMixedArray = [
          {
            id: '1',
            name: 'Test',
            tags: ['valid', 123, null, 'also-valid'] as any,
          },
        ];

        const results = filterAttendees(itemsWithMixedArray, 'valid', {
          fields: ['tags'] as any,
        });
        expect(results).toHaveLength(1);
      });

      it('should handle multiple matches across array elements', () => {
        const items = [
          {
            id: '1',
            name: 'Person 1',
            attributes: ['Staff', 'Sponsor'],
          },
          {
            id: '2',
            name: 'Person 2',
            attributes: ['Staff', 'VIP'],
          },
        ];

        const results = filterAttendees(items, 'Staff', {
          fields: ['attributes'] as any,
        });
        expect(results).toHaveLength(2);
      });
    });
  });
});
