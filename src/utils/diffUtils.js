/**
 * 差分整列ユーティリティ
 * Git風の見た目に近い「類似性ベースのLCS整列」を提供するユーティリティ関数群
 *
 * 提供機能:
 * - 行同士の類似性判定（最長共通部分文字列ベース）
 * - 類似性に基づくLCS整列と削除位置の推定
 *
 * 注意事項:
 * - 本実装はブラウザ実行前提の軽量版であり、パフォーマンス最適化は最小限
 * - 2文字以上の連続共通部分文字列がある場合に「類似」と見なす簡易ロジック
 *
 * グローバル公開:
 * - window.DiffUtils.linesAreSimilar
 * - window.DiffUtils.computeDiffAlignment
 */

/**
 * 行の類似性判定
 * 完全一致は常に類似とみなし、それ以外は2文字以上の連続部分文字列が共通する場合に類似と判定する
 *
 * 実装詳細:
 * - 最長共通部分文字列（LCSではなくLCSubstring）の長さを動的計画法で算出
 * - 長さが2以上であれば true を返す
 *
 * @param {string} a - 比較対象の文字列A
 * @param {string} b - 比較対象の文字列B
 * @returns {boolean} 類似していると判定された場合はtrue
 */
function linesAreSimilar(a, b) {
  if (a === b) return true;
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0 || lenB === 0) return false;

  const prev = new Array(lenB + 1).fill(0);
  const curr = new Array(lenB + 1).fill(0);
  let longest = 0;

  for (let i = 1; i <= lenA; i += 1) {
    for (let j = 1; j <= lenB; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
        if (curr[j] > longest) longest = curr[j];
      } else {
        curr[j] = 0;
      }
    }
    // 行進（prev <- curr）
    for (let j = 0; j <= lenB; j += 1) prev[j] = curr[j];
  }
  return longest >= 2;
}

/**
 * 類似性ベースのLCS整列（Git風）
 * - 類似行はマッチ（編集扱い）
 * - 類似しない基準行は削除（deletionsへマーク）
 * - 類似しない現在行は追加（マークなし、表示側でnew扱い）
 *
 * アルゴリズム概要:
 * - 類似性を条件にしたLCSをDPで構築
 * - 復元時に、baselineにのみ存在する行の位置を削除候補として収集
 *
 * @param {string[]} baselineLines - 基準側の行配列
 * @param {string[]} currentLines - 現在側の行配列
 * @returns {{pairs: Array<[number, number]>, deletions: number[]}} マッチしたインデックス対と削除位置
 */
function computeDiffAlignment(baselineLines, currentLines) {
  const m = baselineLines.length;
  const n = currentLines.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (linesAreSimilar(String(baselineLines[i] ?? ''), String(currentLines[j] ?? ''))) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const positions = new Set();
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && linesAreSimilar(String(baselineLines[i] ?? ''), String(currentLines[j] ?? ''))) {
      pairs.push([i, j]);
      i += 1; j += 1;
    } else if (i < m && (j === n || dp[i + 1][j] >= dp[i][j + 1])) {
      // baselineにのみ存在 → 削除
      positions.add(j);
      i += 1;
    } else if (j < n) {
      // currentにのみ存在 → 追加
      j += 1;
    }
  }

  return { pairs, deletions: Array.from(positions).sort((a, b) => a - b) };
}

// グローバルスコープへ公開
window.DiffUtils = {
  linesAreSimilar,
  computeDiffAlignment
};


