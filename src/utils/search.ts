/**
 * 検索ユーティリティ関数
 *
 * 参加者の検索機能を提供します。
 * - 全角・半角の正規化
 * - ひらがな・カタカナの統一
 * - ローマ字→かな変換（カナフィールド用）
 * - 複数フィールドからの部分一致検索
 */

import { toHiragana } from 'wanakana';

/**
 * 文字列を正規化する
 * - カタカナ→ひらがなに変換
 * - 全角英数字→半角に変換
 * - 全角スペース→半角に変換
 * - 小文字に統一
 * - 前後の空白を削除
 *
 * @param str - 正規化する文字列
 * @returns 正規化された文字列
 */
export function normalizeString(str: string): string {
  return str
    // カタカナ→ひらがなに変換（ァ-ヴ → ぁ-ゔ）
    .replace(/[\u30A1-\u30F6]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0x60)
    )
    // 全角英数字→半角に変換
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    )
    // 全角スペース→半角に変換
    .replace(/　/g, ' ')
    // 小文字に統一
    .toLowerCase()
    // 前後の空白を削除
    .trim();
}

/**
 * 検索対象フィールドの型定義
 */
export type SearchableField = 'name' | 'nameKana' | 'affiliation' | 'affiliationKana';

/**
 * カナ変換対象フィールド
 * これらのフィールドでは、ローマ字入力をかなに変換してから検索する
 */
const KANA_FIELDS: ReadonlySet<string> = new Set(['nameKana', 'affiliationKana']);

/**
 * ローマ字をひらがなに変換する（検索用）
 *
 * wanakanaのtoHiraganaを使用して、ローマ字入力をひらがなに変換します。
 * カタカナ入力もひらがなに変換されます。
 * 漢字やその他の文字はそのまま保持されます。
 *
 * @param str - 変換する文字列
 * @returns ひらがなに変換された文字列
 *
 * @example
 * ```typescript
 * toSearchKana('tanaka') // → 'たなか'
 * toSearchKana('タナカ') // → 'たなか'
 * toSearchKana('田中')   // → '田中' (漢字はそのまま)
 * ```
 */
export function toSearchKana(str: string): string {
  return toHiragana(str, { passRomaji: false });
}

/**
 * 検索設定の型定義
 */
export interface SearchConfig {
  /** 検索対象フィールド */
  fields: SearchableField[];
  /** 正規化処理を行うか（デフォルト: true） */
  normalize?: boolean;
}

/**
 * 汎用的な検索フィルタ関数
 *
 * 複数フィールドからOR検索を行います。
 * 文字種の違いを吸収し、部分一致で検索します。
 *
 * @param items - 検索対象の配列
 * @param query - 検索クエリ
 * @param config - 検索設定
 * @returns フィルタリングされた配列
 *
 * @example
 * ```typescript
 * const results = filterAttendees(attendees, 'たなか', {
 *   fields: ['name', 'nameKana', 'affiliation'],
 *   normalize: true
 * });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function filterAttendees<T extends Record<string, any>>(
  items: T[],
  query: string,
  config: SearchConfig = {
    fields: ['name', 'nameKana', 'affiliation', 'affiliationKana'],
    normalize: true
  }
): T[] {
  // 空クエリの場合は全件返す
  if (!query || query.trim() === '') {
    return items;
  }

  // 検索クエリを正規化（設定による）
  const normalizedQuery = config.normalize !== false
    ? normalizeString(query)
    : query.toLowerCase();

  // カナフィールド用: ローマ字→ひらがな変換後に正規化
  const kanaQuery = config.normalize !== false
    ? normalizeString(toSearchKana(query))
    : query.toLowerCase();

  return items.filter((item) => {
    // いずれかのフィールドがマッチすればtrue（OR検索）
    return config.fields.some((field) => {
      const fieldValue = item[field];

      // nullチェック: undefined, null, 空文字をスキップ
      if (!fieldValue) {
        return false;
      }

      // フィールドタイプに応じてクエリを選択
      const searchQuery = KANA_FIELDS.has(field) ? kanaQuery : normalizedQuery;

      // 文字列配列の場合、配列内のいずれかの要素がマッチすればtrue
      if (Array.isArray(fieldValue)) {
        return fieldValue.some((element) => {
          if (typeof element !== 'string') {
            return false;
          }

          // 要素を正規化（設定による）
          const normalizedElement = config.normalize !== false
            ? normalizeString(element)
            : element.toLowerCase();

          // 部分一致検索
          return normalizedElement.includes(searchQuery);
        });
      }

      // 文字列の場合は従来通り
      if (typeof fieldValue !== 'string') {
        return false;
      }

      // フィールド値を正規化（設定による）
      const normalizedValue = config.normalize !== false
        ? normalizeString(fieldValue)
        : fieldValue.toLowerCase();

      // 部分一致検索
      return normalizedValue.includes(searchQuery);
    });
  });
}
