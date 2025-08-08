/**
 * テンプレート補助ユーティリティ
 * 文中から `{{variable}}` 形式の変数名を抽出する関数を提供
 *
 * 目的:
 * - 変数抽出の正規表現ロジックを一元管理し、重複実装を排除
 * - ブロック適用やコミット時の変数自動追加処理を簡潔にする
 *
 * グローバル公開:
 * - window.TemplateUtils.extractVariableNames
 */

/**
 * テキストまたは行配列から `{{ ... }}` 形式の変数名を抽出
 *
 * 実装メモ:
 * - 変数名の前後の空白は許容するが、名前そのものに空白は含めない
 * - 重複は除外して返却
 *
 * @param {string|string[]} input - 対象テキストまたは行配列
 * @returns {string[]} 抽出された一意な変数名配列
 */
function extractVariableNames(input) {
  const texts = Array.isArray(input) ? input : [String(input ?? '')];
  const re = /\{\{\s*([^}\s]+)\s*\}\}/g;
  const found = new Set();
  try {
    for (const line of texts) {
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(String(line ?? ''))) !== null) {
        found.add(m[1]);
      }
    }
  } catch (_) { /* noop */ }
  return Array.from(found);
}

// グローバルスコープへ公開
window.TemplateUtils = {
  extractVariableNames
};


