/**
 * テンプレート関連ユーティリティ
 * - セグメントテンプレートのトークナイズ
 * - プレビュー展開とインデックスマップ生成
 * - テンプレート分割位置計算
 * - Enter/Backspace/Delete 操作のテンプレ処理
 */

/**
 * セグメントテンプレートのトークン化
 * `{{var}}` を変数トークン、その他をリテラルトークンとして分割する
 *
 * @param {string} template - セグメントのテンプレート文字列（`{{...}}`含む）
 * @returns {Array<{type:'literal', text:string, start:number, end:number}|{type:'variable', name:string, start:number, end:number}>} トークン配列
 */
const tokenizeSegmentTemplate = (template) => {
    const src = String(template ?? '');
    const re = /\{\{\s*([^}\s]+)\s*\}\}/g;
    const tokens = [];
    let last = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
        if (m.index > last) {
            tokens.push({ type: 'literal', text: src.slice(last, m.index), start: last, end: m.index });
        }
        tokens.push({ type: 'variable', name: m[1], start: m.index, end: re.lastIndex });
        last = re.lastIndex;
    }
    if (last < src.length) {
        tokens.push({ type: 'literal', text: src.slice(last), start: last, end: src.length });
    }
    return tokens;
};

/**
 * プレビュー文字列とインデックスマップの生成
 * 各行（各セグメント）について、展開後文字ごとの出自（リテラル/変数）をマップする
 *
 * @param {Array<{content:string}>} segments - セグメント配列
 * @param {Array<{id:string,name:string,value:string}>} variables - 変数配列
 * @returns {{previewText:string, lineMaps:Array<{segmentIndex:number, tokens:Array, charMap:Array, expanded:string}>}} 生成結果
 */
const renderPreviewWithIndexMap = (segments, variables) => {
    const varByName = new Map(Array.isArray(variables) ? variables.map(v => [String(v.name), v]) : []);
    const lineMaps = [];
    const expandedLines = [];
    (Array.isArray(segments) ? segments : []).forEach((seg, idx) => {
        const template = String(seg && seg.content || '');
        const tokens = tokenizeSegmentTemplate(template);
        const parts = [];
        const charMap = [];
        tokens.forEach((t, tokenIndex) => {
            if (t.type === 'literal') {
                parts.push(t.text);
                for (let k = 0; k < t.text.length; k += 1) {
                    charMap.push({ type: 'literal', segmentIndex: idx, templateOffset: t.start + k, tokenIndex });
                }
            } else {
                const v = varByName.get(String(t.name));
                const value = String(v && v.value || `{{${t.name}}}`);
                parts.push(value);
                for (let k = 0; k < value.length; k += 1) {
                    charMap.push({ type: 'variable', segmentIndex: idx, variableId: v ? v.id : null, variableName: t.name, offsetInValue: k, tokenIndex });
                }
            }
        });
        const expanded = parts.join('');
        expandedLines.push(expanded);
        lineMaps.push({ segmentIndex: idx, tokens, charMap, expanded });
    });
    return { previewText: expandedLines.join('\n'), lineMaps };
};

/**
 * テンプレート分割位置の決定（Enter 用）
 * カーソル列位置から、テンプレート文字列の安全な分割オフセットを返す
 * - リテラル内: 対応するテンプレートオフセット
 * - 変数内: プレースホルダ境界（開始/終了）の近い方へスナップ
 *
 * @param {{segmentIndex:number, tokens:Array, charMap:Array, expanded:string}} lineMap - 対象行のマップ
 * @param {number} column - 行内のカーソル列（0始まり）
 * @returns {number} テンプレート分割オフセット
 */
const computeTemplateSplitOffset = (lineMap, column) => {
    const totalChars = (lineMap && Array.isArray(lineMap.charMap)) ? lineMap.charMap.length : 0;
    const col = Math.max(0, Math.min(column, totalChars));
    if (!lineMap || !Array.isArray(lineMap.charMap) || totalChars === 0) {
        const firstToken = (lineMap && Array.isArray(lineMap.tokens) && lineMap.tokens[0]) ? lineMap.tokens[0] : null;
        return firstToken ? firstToken.start : 0;
    }

    if (col <= 0) {
        const firstToken = lineMap.tokens && lineMap.tokens[0];
        return firstToken ? firstToken.start : 0;
    }
    if (col >= totalChars) {
        const lastToken = lineMap.tokens && lineMap.tokens[lineMap.tokens.length - 1];
        return lastToken ? lastToken.end : 0;
    }

    const leftIdx = col - 1;
    const rightIdx = col;
    const left = lineMap.charMap[leftIdx];
    const right = lineMap.charMap[rightIdx];

    if (right && right.type === 'literal') return right.templateOffset;
    if (left && left.type === 'literal') return left.templateOffset + 1;

    const tokenIndex = right ? right.tokenIndex : (left ? left.tokenIndex : -1);
    if (tokenIndex >= 0 && Array.isArray(lineMap.tokens)) {
        const tok = lineMap.tokens[tokenIndex];
        if (tok && tok.type === 'variable') {
            let cnt = 0;
            for (let i = 0; i < lineMap.charMap.length; i += 1) {
                const m = lineMap.charMap[i];
                if (m.tokenIndex === tokenIndex && m.type === 'variable') cnt += 1;
                else if (cnt > 0) break;
            }
            const mid = Math.floor(cnt / 2);
            const offsetInToken = right ? right.offsetInValue : (left ? left.offsetInValue + 1 : 0);
            const snapToStart = offsetInToken <= mid;
            return snapToStart ? tok.start : tok.end;
        }
    }
    const lastToken = lineMap.tokens && lineMap.tokens[lineMap.tokens.length - 1];
    return lastToken ? lastToken.end : 0;
};

/**
 * Enter操作の適用（行分割）
 * 変数を含む場合はトークン境界へスナップしてテンプレートを分割
 *
 * @param {Array<{id:string,content:string}>} segments - セグメント配列
 * @param {Array} variables - 変数配列（未使用だが将来的拡張用）
 * @param {number} lineIndex - 行インデックス
 * @param {number} column - 列インデックス
 * @param {Array} lineMaps - renderPreviewWithIndexMap の lineMaps
 * @returns {Array} 更新後セグメント配列
 */
const applyEnterAt = (segments, variables, lineIndex, column, lineMaps) => {
    const idx = Math.max(0, Math.min(lineIndex, (segments || []).length - 1));
    const lineMap = Array.isArray(lineMaps) ? lineMaps[idx] : null;
    const seg = segments[idx];
    if (!seg) return segments;
    const template = String(seg.content || '');
    const splitOffset = computeTemplateSplitOffset(lineMap, column);
    const left = template.slice(0, splitOffset);
    const right = template.slice(splitOffset);
    const next = [...segments];
    next[idx] = { ...seg, content: left };
    next.splice(idx + 1, 0, { id: (window.Helpers && window.Helpers.generateId ? window.Helpers.generateId() : Math.random().toString(36).slice(2)), content: right });
    return next;
};

/**
 * Backspace（行頭）: 前行と結合
 * @param {Array<{id:string,content:string}>} segments
 * @param {number} lineIndex
 * @returns {Array}
 */
const applyBackspaceAtLineStart = (segments, lineIndex) => {
    if (!Array.isArray(segments) || segments.length === 0) return segments;
    const idx = Math.max(0, Math.min(lineIndex, segments.length - 1));
    if (idx === 0) return segments;
    const prev = segments[idx - 1];
    const curr = segments[idx];
    const merged = String(prev.content || '') + String(curr.content || '');
    const next = [...segments];
    next[idx - 1] = { ...prev, content: merged };
    next.splice(idx, 1);
    return next;
};

/**
 * Delete（行末）: 次行と結合
 * @param {Array<{id:string,content:string}>} segments
 * @param {number} lineIndex
 * @returns {Array}
 */
const applyDeleteAtLineEnd = (segments, lineIndex) => {
    if (!Array.isArray(segments) || segments.length === 0) return segments;
    const idx = Math.max(0, Math.min(lineIndex, segments.length - 1));
    if (idx >= segments.length - 1) return segments;
    const curr = segments[idx];
    const nextSeg = segments[idx + 1];
    const merged = String(curr.content || '') + String(nextSeg.content || '');
    const next = [...segments];
    next[idx] = { ...curr, content: merged };
    next.splice(idx + 1, 1);
    return next;
};

// 公開
window.Helpers = Object.assign(window.Helpers || {}, {
    tokenizeSegmentTemplate,
    renderPreviewWithIndexMap,
    computeTemplateSplitOffset,
    applyEnterAt,
    applyBackspaceAtLineStart,
    applyDeleteAtLineEnd
});


