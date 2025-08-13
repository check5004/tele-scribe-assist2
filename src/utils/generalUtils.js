/**
 * 一般ユーティリティ関数群
 * - 乱数ID生成、デバウンス、正規表現エスケープ、履歴整形、簡易曖昧検索、配列先頭ユニーク追加
 * - 既存の window.Helpers API を維持するため、末尾でグローバルへ公開する
 */

/**
 * ユニークID生成関数
 * ランダムな文字列を使用した簡易ユニークIDを生成
 * Reactのkey、セグメントID、変数IDなどで使用
 *
 * 注意: この実装は簡易版であり、クリプトグラフィックな安全性は保証されない
 *
 * @returns {string} 9文字のランダムID文字列
 */
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * デバウンス関数
 * 関数の実行を指定時間遅延させ、連続実行を防ぐ
 *
 * @param {Function} func - 実行する関数
 * @param {number} delay - 遅延時間（ミリ秒）
 * @returns {Function} デバウンスされた関数
 */
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
};

/**
 * 正規表現エスケープヘルパー関数
 * 文字列内の正規表現特殊文字をエスケープする
 *
 * @param {string} string - エスケープする文字列
 * @returns {string} エスケープされた文字列
 */
const escapeRegExp = (string) => {
    return String(string ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * 値を先頭へユニーク追加するユーティリティ
 * 既存に同一値がある場合はその要素を先頭へ移動し、最大長を超える分は末尾から削除する
 *
 * @param {string[]} list - 既存配列
 * @param {string} value - 追加（または先頭へ移動）する値
 * @param {number} maxLen - 配列の最大長（超過時は末尾から削除）
 * @returns {string[]} 先頭ユニーク追加後の新しい配列
 */
const pushUniqueFront = (list, value, maxLen) => {
    const normalized = String(value ?? '');
    const src = Array.isArray(list) ? list.slice() : [];
    const filtered = src.filter(v => v !== normalized);
    const result = [normalized, ...filtered];
    if (typeof maxLen === 'number' && maxLen > 0 && result.length > maxLen) {
        return result.slice(0, maxLen);
    }
    return result;
};

/**
 * 簡易曖昧検索（部分一致＋サブシーケンス）のランキング
 * クエリが空のときは候補をそのまま返す。
 * スコアリング基準:
 * - 完全一致: 高スコア
 * - 前方一致: 中スコア
 * - 部分一致: 低スコア（一致長に応じて加点）
 * - サブシーケンス一致: ごく低スコア（連続一致長に応じて微加点）
 *
 * @param {string[]} candidates - 候補文字列配列
 * @param {string} query - 検索クエリ
 * @returns {string[]} ランク付け済み候補（降順）
 */
const fuzzyFilterAndRank = (candidates, query) => {
    const q = String(query || '').trim().toLowerCase();
    const items = (Array.isArray(candidates) ? candidates : []).map(c => String(c || ''));
    if (!q) return items;
    const scoreOf = (s) => {
        const t = s.toLowerCase();
        if (t === q) return 1000;
        if (t.startsWith(q)) return 800 + q.length;
        const idx = t.indexOf(q);
        if (idx >= 0) return 500 + (q.length * 2) - idx; // 早い位置ほど加点
        // サブシーケンス
        let qi = 0, streak = 0, best = 0;
        for (let i = 0; i < t.length && qi < q.length; i++) {
            if (t[i] === q[qi]) {
                qi++;
                streak++;
                best = Math.max(best, streak);
            } else {
                streak = 0;
            }
        }
        return qi === q.length ? 100 + best : 0;
    };
    return items
        .map(s => ({ s, sc: scoreOf(s) }))
        .filter(x => x.sc > 0)
        .sort((a, b) => b.sc - a.sc || a.s.length - b.s.length)
        .map(x => x.s);
};

/**
 * 入力履歴オブジェクトの形状を補正
 * 既存データ（後方互換）に不足キー `variableNames`/`valueGroups` を追加し、既定形へ整える
 *
 * @param {any} h - 入力履歴オブジェクト（不完全でも可）
 * @returns {{variables: Record<string,string[]>, segments: string[], variableNames: string[], valueGroups: Array<{id:string,savedAt:string,variables:Record<string,string>}>}} 補完済み履歴
 */
const ensureInputHistoryShape = (h) => {
    const base = (typeof h === 'object' && h) ? h : {};
    const variables = (typeof base.variables === 'object' && base.variables) ? base.variables : {};
    const segments = Array.isArray(base.segments) ? base.segments : [];
    const variableNames = Array.isArray(base.variableNames) ? base.variableNames : [];
    const valueGroups = Array.isArray(base.valueGroups) ? base.valueGroups : [];
    return { variables, segments, variableNames, valueGroups };
};

// グローバル公開（既存 API 維持）
window.Helpers = Object.assign(window.Helpers || {}, {
    generateId,
    debounce,
    escapeRegExp,
    pushUniqueFront,
    fuzzyFilterAndRank,
    ensureInputHistoryShape
});


