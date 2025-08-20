/**
 * プレビュー同期コア
 * - 単一/複数変数の値抽出
 * - 変数を含むセグメントの更新
 * - プレビュー編集→セグメント/変数同期更新
 */

/**
 * 単一変数の値を抽出
 * セグメントパターンと編集された行から変数の新しい値を抽出
 *
 * @param {string} segmentContent - セグメントの内容（{{変数名}}形式）
 * @param {string} variableName - 変数名
 * @param {string} editedLine - 編集された行
 * @returns {string|null} 抽出された変数値、失敗時はnull
 */
const extractSingleVariableValue = (segmentContent, variableName, editedLine) => {
    try {
        const variablePattern = `{{${variableName}}}`;
        const variableIndex = segmentContent.indexOf(variablePattern);
        if (variableIndex === -1) return null;
        const beforeVariable = segmentContent.substring(0, variableIndex);
        const afterVariable = segmentContent.substring(variableIndex + variablePattern.length);
        let startIndex = 0;
        let endIndex = editedLine.length;
        if (beforeVariable) {
            const beforeIndex = editedLine.indexOf(beforeVariable);
            if (beforeIndex === -1) return null;
            startIndex = beforeIndex + beforeVariable.length;
        }
        if (afterVariable) {
            let afterIndex = editedLine.indexOf(afterVariable, startIndex);
            if (afterIndex === -1 && startIndex < editedLine.length) {
                for (let i = startIndex; i <= editedLine.length; i++) {
                    afterIndex = editedLine.indexOf(afterVariable, i);
                    if (afterIndex !== -1) break;
                }
            }
            if (afterIndex === -1) {
                if (afterVariable.length > 1) {
                    const partialAfter = (window.Helpers && typeof window.Helpers.takeFirstGraphemes === 'function')
                        ? window.Helpers.takeFirstGraphemes(afterVariable, 1)
                        : afterVariable.substring(0, Math.min(1, afterVariable.length));
                    afterIndex = editedLine.indexOf(partialAfter, startIndex);
                    if (afterIndex !== -1) {
                        endIndex = afterIndex;
                    } else {
                        endIndex = editedLine.length;
                    }
                } else {
                    endIndex = editedLine.length;
                }
            } else {
                endIndex = afterIndex;
            }
        }
        const extractedValue = editedLine.substring(startIndex, endIndex);
        return extractedValue.trim();
    } catch (error) {
        console.warn('変数値抽出エラー:', error);
        return null;
    }
};

/**
 * 複数変数の値を抽出（トークン境界ベース・グラフェム対応）
 *
 * 方針:
 * - `tokenizeSegmentTemplate` によりテンプレートをリテラル/変数トークンへ分割
 * - editedLine を左から走査し、リテラルトークンの位置を基準に、その直前のチャンクを
 *   直前までに出現した変数トークンへ割り当てる
 * - 変数が隣接する（間にリテラルがない）場合は、旧値のグラフェム長比でチャンクを按分
 * - リテラルが一致しない場合は、1グラフェムのプレフィックスで妥協検索し、それでも
 *   見つからなければ残り全体を直前変数群へ割り当てる
 *
 * 制約:
 * - リテラル部分が大きく変更された場合は境界推定が難しいため、割り当て精度が低下する
 * - 隣接変数の完全な分割は旧値長に依存する（完全に新しい桁数配分は推定）
 *
 * @param {string} segmentContent - セグメントの内容（`{{var}}` を含むテンプレート）
 * @param {Array<{id:string,name:string,value:string}>} variablesInLine - 当該行に含まれる変数オブジェクト配列
 * @param {string} currentLine - 現在の行（変数が値に置換された文字列）
 * @param {string} editedLine - 編集された行
 * @returns {Array<{variableId:string,newValue:string}>} 更新された変数値の配列
 */
const extractMultipleVariableValues = (segmentContent, variablesInLine, currentLine, editedLine) => {
    const updatedValues = [];
    try {
        const tokens = (window.Helpers && typeof window.Helpers.tokenizeSegmentTemplate === 'function')
            ? window.Helpers.tokenizeSegmentTemplate(segmentContent)
            : [];

        if (!Array.isArray(tokens) || tokens.length === 0) return updatedValues;

        // 変数名 -> 変数オブジェクト
        const nameToVar = new Map((Array.isArray(variablesInLine) ? variablesInLine : [])
            .map(v => [String(v && v.name), v]));

        // 走査位置と保留中の変数
        let scanPos = 0;
        let pendingVars = [];

        // グラフェム配列化ヘルパー
        const toGraphemes = (s) => {
            try {
                if (window.Helpers && typeof window.Helpers.splitGraphemes === 'function') {
                    return window.Helpers.splitGraphemes(String(s ?? ''));
                }
                return Array.from(String(s ?? ''));
            } catch (_) {
                const str = String(s ?? '');
                const out = [];
                for (let i = 0; i < str.length; i += 1) out.push(str[i]);
                return out;
            }
        };

        // 直前までの変数群へチャンクを割り当て
        // nextLiteral を用いて、chunk 末尾とリテラル先頭の最大一致長（グラフェム）を計算し、その分はリテラル側へ残す
        const assignChunkToPending = (chunk, nextLiteral = '') => {
            if (!pendingVars || pendingVars.length === 0) return;
            const chunkArrFull = toGraphemes(chunk);
            let guard = 0;
            try {
                const nextArr = toGraphemes(String(nextLiteral || ''));
                const maxK = Math.min(chunkArrFull.length, nextArr.length);
                for (let k = maxK; k > 0; k -= 1) {
                    let ok = true;
                    for (let i = 0; i < k; i += 1) {
                        if (chunkArrFull[chunkArrFull.length - k + i] !== nextArr[i]) { ok = false; break; }
                    }
                    if (ok) { guard = k; break; }
                }
            } catch (_) {}
            // 末尾+1グラフェムは変数側へ含めるため、重なりから1グラフェム分を差し引く
            const effGuard = guard > 0 ? guard - 1 : 0;
            const chunkArr = effGuard > 0 ? chunkArrFull.slice(0, -effGuard) : chunkArrFull;
            const total = chunkArr.length;
            if (pendingVars.length === 1) {
                const only = pendingVars[0];
                // 旧値が空（未入力）の場合は、リテラル編集を変数へ吸い込まない
                const oldLen = toGraphemes(String(only && only.value || '')).length;
                if (oldLen === 0) return;
                updatedValues.push({ variableId: only.id, newValue: chunkArr.join('').trim() });
                return;
            }
            const oldLens = pendingVars.map(v => toGraphemes(String(v && v.value || '')).length);
            const sum = oldLens.reduce((a, b) => a + b, 0);
            let start = 0;
            for (let i = 0; i < pendingVars.length; i += 1) {
                let take;
                if (i === pendingVars.length - 1) {
                    take = total - start;
                } else if (sum > 0) {
                    take = Math.round(total * (oldLens[i] / sum));
                } else {
                    // 全員未入力（旧値長=0）の場合は、リテラル編集を変数へ吸い込まない
                    take = 0;
                }
                if (take < 0) take = 0;
                if (start + take > total) take = total - start;
                const slice = chunkArr.slice(start, start + take).join('');
                if (take > 0) {
                    updatedValues.push({ variableId: pendingVars[i].id, newValue: slice.trim() });
                }
                start += take;
            }
        };

        // トークン列を左から走査
        for (let ti = 0; ti < tokens.length; ti += 1) {
            const t = tokens[ti];
            if (t && t.type === 'variable') {
                const v = nameToVar.get(String(t.name));
                if (v) pendingVars.push(v);
            } else if (t && t.type === 'literal') {
                const literal = String(t.text || '');
                if (literal.length === 0) continue; // 空リテラルはスキップ

                let idx = editedLine.indexOf(literal, scanPos);
                if (idx === -1) {
                    // 1グラフェムのプレフィックスで妥協検索
                    try {
                        const prefix = (window.Helpers && typeof window.Helpers.takeFirstGraphemes === 'function')
                            ? window.Helpers.takeFirstGraphemes(literal, 1)
                            : literal.slice(0, 1);
                        if (prefix) idx = editedLine.indexOf(prefix, scanPos);
                    } catch (_) {}
                }

                if (idx === -1) {
                    // リテラルが見つからない: 残りはリテラル編集と見なして、変数値は変更しない
                    scanPos = editedLine.length;
                    pendingVars = [];
                } else {
                    // 直前のチャンクを割り当て（次のリテラル先頭と重なる部分はリテラルへ）
                    const chunk = editedLine.substring(scanPos, idx);
                    assignChunkToPending(chunk, literal);
                    // リテラルの直後へ移動
                    scanPos = idx + literal.length;
                    pendingVars = [];
                }
            }
        }

        // 末尾が変数で終わる場合に対応
        if (pendingVars.length > 0) {
            const chunk = editedLine.slice(scanPos);
            assignChunkToPending(chunk, '');
            pendingVars = [];
        }
    } catch (error) {
        console.warn('複数変数値抽出エラー:', error);
    }
    return updatedValues;
};

/**
 * 変数を含むセグメントの更新処理
 * 変数値の更新とセグメント内容の推定を行う
 *
 * @param {string} segmentContent - 元のセグメント内容
 * @param {Array} variablesInLine - この行に含まれる変数配列
 * @param {string} currentLine - 現在の行（変数展開済み）
 * @param {string} editedLine - 編集された行
 * @param {Array} currentVariables - 現在の変数配列
 * @returns {Object} 更新結果 {updatedVariables: [], newSegmentContent: string|null}
 */
const updateSegmentWithVariables = (segmentContent, variablesInLine, currentLine, editedLine, currentVariables) => {
    const updatedVariables = [];
    let newSegmentContent = null;
    try {
        if (variablesInLine.length === 1) {
            const variable = variablesInLine[0];

            // 変更位置がリテラル内かどうかを判定（リテラル内なら変数値は更新しない）
            let changedAtLiteral = false;
            try {
                if (window.Helpers && typeof window.Helpers.renderPreviewWithIndexMap === 'function') {
                    const rendered = window.Helpers.renderPreviewWithIndexMap([{ content: segmentContent }], variablesInLine || []);
                    const lm = rendered && Array.isArray(rendered.lineMaps) ? rendered.lineMaps[0] : null;
                    const expanded = lm && typeof lm.expanded === 'string' ? lm.expanded : currentLine;
                    const cm = Array.isArray(lm && lm.charMap) ? lm.charMap : [];
                    const a = String(expanded || '');
                    const b = String(editedLine || '');
                    const m = Math.min(a.length, b.length);
                    let p = 0;
                    while (p < m && a[p] === b[p]) p += 1;
                    if (p < a.length || p < b.length) {
                        if (p < cm.length) {
                            const isLiteralPos = (cm[p] && cm[p].type === 'literal');
                            // 直前が変数なら、末尾+1の編集を変数編集として扱う
                            if (isLiteralPos && p > 0 && cm[p - 1] && cm[p - 1].type === 'variable') {
                                changedAtLiteral = false;
                            } else {
                                changedAtLiteral = isLiteralPos;
                            }
                        } else {
                            const prev = cm[cm.length - 1];
                            changedAtLiteral = !!(prev && prev.type === 'literal');
                        }
                    }
                }
            } catch (_) {}

            // 変数値の更新（リテラル編集のみであればスキップ）
            if (!changedAtLiteral) {
                const newValue = extractSingleVariableValue(segmentContent, variable.name, editedLine);
                if (newValue !== null && newValue !== variable.value) {
                    updatedVariables.push({ variableId: variable.id, newValue });
                }
            }
            const variablePattern = `{{${variable.name}}}`;
            const variableIndex = segmentContent.indexOf(variablePattern);
            if (variableIndex !== -1) {
                const beforeVar = segmentContent.substring(0, variableIndex);
                const afterVar = segmentContent.substring(variableIndex + variablePattern.length);
                const currentValue = variable.value || '';
                const newVariableValue = changedAtLiteral ? null : extractSingleVariableValue(segmentContent, variable.name, editedLine);
                let targetValue = newVariableValue;
                if (targetValue === null || targetValue === '') targetValue = currentValue;
                if (targetValue && targetValue !== '') {
                    // アンカー（前後1グラフェム）を使って値の開始位置を安定検出
                    const getPrevTail = () => {
                        try {
                            if (beforeVar && beforeVar.length > 0) {
                                const arr = (window.Helpers && typeof window.Helpers.splitGraphemes === 'function')
                                    ? window.Helpers.splitGraphemes(String(beforeVar || ''))
                                    : Array.from(String(beforeVar || ''));
                                return arr.length > 0 ? arr[arr.length - 1] : '';
                            }
                        } catch (_) {}
                        return '';
                    };
                    const getNextHead = () => {
                        try {
                            if (afterVar && afterVar.length > 0) {
                                const arr = (window.Helpers && typeof window.Helpers.splitGraphemes === 'function')
                                    ? window.Helpers.splitGraphemes(String(afterVar || ''))
                                    : Array.from(String(afterVar || ''));
                                return arr.length > 0 ? arr[0] : '';
                            }
                        } catch (_) {}
                        return '';
                    };
                    const prevTail = getPrevTail();
                    const nextHead = getNextHead();

                    const candidateValues = [];
                    candidateValues.push(String(targetValue));
                    if (currentValue && currentValue !== targetValue) candidateValues.push(String(currentValue));

                    let valueIndex = -1;
                    for (const val of candidateValues) {
                        const patterns = [];
                        if (prevTail || nextHead) patterns.push({ pattern: `${prevTail || ''}${val}${nextHead || ''}`, adjust: prevTail ? 1 : 0 });
                        if (nextHead) patterns.push({ pattern: `${val}${nextHead}`, adjust: 0 });
                        if (prevTail) patterns.push({ pattern: `${prevTail}${val}`, adjust: prevTail ? 1 : 0 });
                        patterns.push({ pattern: `${val}`, adjust: 0 });

                        let found = -1;
                        for (const ptn of patterns) {
                            const pos = editedLine.indexOf(ptn.pattern, 0);
                            if (pos !== -1) { found = pos + ptn.adjust; break; }
                        }
                        if (found !== -1) { valueIndex = found; targetValue = val; break; }
                    }

                    if (valueIndex !== -1) {
                        const editedBeforeVar = editedLine.substring(0, valueIndex);
                        const editedAfterVar = editedLine.substring(valueIndex + targetValue.length);
                        if (editedBeforeVar !== beforeVar || editedAfterVar !== afterVar) {
                            newSegmentContent = editedBeforeVar + variablePattern + editedAfterVar;
                        }
                    } else {
                        let estimatedStart = 0;
                        let estimatedEnd = editedLine.length;
                        if (beforeVar) {
                            const beforeIndex = editedLine.indexOf(beforeVar);
                            if (beforeIndex !== -1) estimatedStart = beforeIndex + beforeVar.length;
                        }
                        if (afterVar) {
                            let afterIndex = editedLine.indexOf(afterVar, estimatedStart);
                            if (afterIndex === -1 && afterVar.length > 0) {
                                try {
                                    const head = (window.Helpers && typeof window.Helpers.takeFirstGraphemes === 'function')
                                        ? window.Helpers.takeFirstGraphemes(afterVar, 1)
                                        : afterVar.slice(0, 1);
                                    if (head) afterIndex = editedLine.indexOf(head, estimatedStart);
                                } catch (_) {}
                            }
                            if (afterIndex !== -1) estimatedEnd = afterIndex;
                        }
                        const estimatedBeforeVar = editedLine.substring(0, estimatedStart);
                        const estimatedAfterVar = editedLine.substring(estimatedEnd);
                        if (estimatedBeforeVar !== beforeVar || estimatedAfterVar !== afterVar) {
                            newSegmentContent = estimatedBeforeVar + variablePattern + estimatedAfterVar;
                        }
                    }
                } else {
                    let estimatedStart = 0;
                    let estimatedEnd = editedLine.length;
                    if (beforeVar) {
                        const beforeIndex = editedLine.indexOf(beforeVar);
                        if (beforeIndex !== -1) estimatedStart = beforeIndex + beforeVar.length;
                    }
                    if (afterVar) {
                        const afterIndex = editedLine.indexOf(afterVar, estimatedStart);
                        if (afterIndex !== -1) estimatedEnd = afterIndex;
                    }
                    const estimatedBeforeVar = editedLine.substring(0, estimatedStart);
                    const estimatedAfterVar = editedLine.substring(estimatedEnd);
                    if (estimatedBeforeVar !== beforeVar || estimatedAfterVar !== afterVar) {
                        newSegmentContent = estimatedBeforeVar + variablePattern + estimatedAfterVar;
                    }
                }
            }
        } else {
            // まず最初の差分位置がリテラル内かどうかで分岐（リテラル内なら変数は更新しない）
            let changedAtLiteral = false;
            try {
                if (window.Helpers && typeof window.Helpers.renderPreviewWithIndexMap === 'function') {
                    const rendered = window.Helpers.renderPreviewWithIndexMap([{ content: segmentContent }], variablesInLine || []);
                    const lm = rendered && Array.isArray(rendered.lineMaps) ? rendered.lineMaps[0] : null;
                    const expanded = lm && typeof lm.expanded === 'string' ? lm.expanded : currentLine;
                    const cm = Array.isArray(lm && lm.charMap) ? lm.charMap : [];
                    const a = String(expanded || '');
                    const b = String(editedLine || '');
                    const m = Math.min(a.length, b.length);
                    let p = 0;
                    while (p < m && a[p] === b[p]) p += 1;
                    if (p < a.length || p < b.length) {
                        if (p < cm.length) {
                            const isLiteralPos = (cm[p] && cm[p].type === 'literal');
                            // 直前が変数なら、末尾+1の編集を変数編集として扱う
                            if (isLiteralPos && p > 0 && cm[p - 1] && cm[p - 1].type === 'variable') {
                                changedAtLiteral = false;
                            } else {
                                changedAtLiteral = isLiteralPos;
                            }
                        } else {
                            // 差分が末尾側の場合: 直前位置の種別で推定
                            const prev = cm[cm.length - 1];
                            changedAtLiteral = !!(prev && prev.type === 'literal');
                        }
                    }
                }
            } catch (_) {}

            // トークナイズ（以降の再構築でも使用）
            const tokens = (window.Helpers && typeof window.Helpers.tokenizeSegmentTemplate === 'function')
                ? window.Helpers.tokenizeSegmentTemplate(segmentContent)
                : [];
            const nameToVar = new Map(variablesInLine.map(v => [String(v.name), v]));
            const orderedVarEntries = [];
            tokens.forEach((t, ti) => {
                if (t && t.type === 'variable') {
                    const v = nameToVar.get(String(t.name));
                    if (v) orderedVarEntries.push({ v, tokenIndex: ti, name: String(t.name), literalAfter: null });
                }
            });

            // 次リテラルテキストを各変数に紐付け
            orderedVarEntries.forEach(entry => {
                const start = entry.tokenIndex + 1;
                let nextLit = '';
                for (let j = start; j < tokens.length; j += 1) {
                    const t = tokens[j];
                    if (t && t.type === 'literal' && String(t.text || '').length > 0) {
                        nextLit = String(t.text || '');
                        break;
                    }
                }
                entry.literalAfter = nextLit;
            });

            const allVarNames = orderedVarEntries.map(e => e.name);
            const stripPlaceholders = (text) => {
                let out = String(text ?? '');
                allVarNames.forEach(n => {
                    try {
                        const esc = (window.Helpers && typeof window.Helpers.escapeRegExp === 'function')
                            ? window.Helpers.escapeRegExp(n)
                            : n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const re = new RegExp(`\\{\\{\\s*${esc}\\s*\\}\\}`, 'g');
                        out = out.replace(re, '');
                    } catch (_) {}
                });
                return out;
            };

            if (!changedAtLiteral) {
                const extractedValues = extractMultipleVariableValues(
                    segmentContent,
                    variablesInLine,
                    currentLine,
                    editedLine
                );
                updatedVariables.push(...extractedValues);
            }

            if (orderedVarEntries.length > 0) {
                const idToNewValue = new Map();
                const idToRaw = new Map();
                // 変数更新がある場合のみ新値を利用（リテラル編集だけなら旧値据え置き）
                if (!changedAtLiteral) {
                    const extractedValues = extractMultipleVariableValues(
                        segmentContent,
                        variablesInLine,
                        currentLine,
                        editedLine
                    );
                    extractedValues.forEach(({ variableId, newValue, rawSegment }) => {
                        idToNewValue.set(variableId, newValue);
                        if (typeof rawSegment === 'string') idToRaw.set(variableId, rawSegment);
                    });
                }

                // editedLine から順に、各変数の位置を決めてテンプレを再構築
                let scanPos = 0;
                let rebuilt = '';
                for (let i = 0; i < orderedVarEntries.length; i += 1) {
                    const { v, name, literalAfter } = orderedVarEntries[i];
                    const raw = idToRaw.has(v.id)
                        ? idToRaw.get(v.id)
                        : (idToNewValue.has(v.id) ? idToNewValue.get(v.id) : (v.value || ''));
                    const rawStr = String(raw ?? '');

                    if (rawStr.length > 0) {
                        // 値がある場合は前後1グラフェムのアンカーで境界決定（認識のみ）。末尾＋1は消費しない。
                        const getPrevTail = () => {
                            try {
                                for (let j = orderedVarEntries[i].tokenIndex - 1; j >= 0; j -= 1) {
                                    const t = tokens[j];
                                    if (t && t.type === 'literal' && String(t.text || '').length > 0) {
                                        const arr = (window.Helpers && typeof window.Helpers.splitGraphemes === 'function')
                                            ? window.Helpers.splitGraphemes(String(t.text || ''))
                                            : Array.from(String(t.text || ''));
                                        return arr.length > 0 ? arr[arr.length - 1] : '';
                                    }
                                }
                            } catch (_) {}
                            return '';
                        };
                        const getNextHead = () => {
                            try {
                                const arr = (window.Helpers && typeof window.Helpers.splitGraphemes === 'function')
                                    ? window.Helpers.splitGraphemes(String(literalAfter || ''))
                                    : Array.from(String(literalAfter || ''));
                                return arr.length > 0 ? arr[0] : '';
                            } catch (_) { return ''; }
                        };
                        const prevTail = getPrevTail();
                        const nextHead = getNextHead();

                        const candidates = [];
                        if (prevTail || nextHead) {
                            candidates.push({ pattern: `${prevTail || ''}${rawStr}${nextHead || ''}`, adjust: prevTail ? 1 : 0 });
                        }
                        if (nextHead) candidates.push({ pattern: `${rawStr}${nextHead}`, adjust: 0 });
                        if (prevTail) candidates.push({ pattern: `${prevTail}${rawStr}`, adjust: prevTail ? 1 : 0 });
                        candidates.push({ pattern: rawStr, adjust: 0 });

                        const startAt = Math.max(0, scanPos - (prevTail ? 1 : 0));
                        let valueStart = -1;
                        for (const c of candidates) {
                            const pos = editedLine.indexOf(c.pattern, startAt);
                            if (pos !== -1) {
                                valueStart = pos + c.adjust;
                                break;
                            }
                        }

                        if (valueStart === -1) {
                            // 値が見つからない場合は、次リテラルまでをリテラルとして取り込む
                            let nextIdx = -1;
                            if (literalAfter) {
                                nextIdx = editedLine.indexOf(literalAfter, scanPos);
                                if (nextIdx === -1) {
                                    try {
                                        const pref = (window.Helpers && typeof window.Helpers.takeFirstGraphemes === 'function')
                                            ? window.Helpers.takeFirstGraphemes(literalAfter, 1)
                                            : literalAfter.slice(0, 1);
                                        if (pref) nextIdx = editedLine.indexOf(pref, scanPos);
                                    } catch (_) {}
                                }
                            }
                            const chunk = editedLine.substring(scanPos, nextIdx === -1 ? editedLine.length : nextIdx);
                            rebuilt += stripPlaceholders(chunk);
                            // プレースホルダ挿入
                            rebuilt += '{{' + name + '}}';
                            scanPos = (nextIdx === -1) ? editedLine.length : nextIdx;
                        } else {
                            // 前リテラル部分を保持（変数由来の {{...}} は除去）
                            const chunk = editedLine.substring(scanPos, valueStart);
                            rebuilt += stripPlaceholders(chunk);
                            // プレースホルダ挿入
                            rebuilt += '{{' + name + '}}';
                            // 値の長さ分だけ進め、次リテラル先頭（+1）は消費しない
                            scanPos = valueStart + rawStr.length;
                        }
                    } else {
                        // 値が空の場合: 次のリテラル位置までをリテラルとして取り込み、プレースホルダを挿入
                        let nextIdx = -1;
                        if (literalAfter) {
                            nextIdx = editedLine.indexOf(literalAfter, scanPos);
                            if (nextIdx === -1) {
                                try {
                                    const pref = (window.Helpers && typeof window.Helpers.takeFirstGraphemes === 'function')
                                        ? window.Helpers.takeFirstGraphemes(literalAfter, 1)
                                        : literalAfter.slice(0, 1);
                                    if (pref) nextIdx = editedLine.indexOf(pref, scanPos);
                                } catch (_) {}
                            }
                        }
                        const chunk = editedLine.substring(scanPos, nextIdx === -1 ? editedLine.length : nextIdx);
                        rebuilt += stripPlaceholders(chunk);
                        rebuilt += '{{' + name + '}}';
                        scanPos = (nextIdx === -1) ? editedLine.length : nextIdx;
                    }
                }
                // 末尾のリテラルを追加（残留の {{...}} は除去）
                rebuilt += stripPlaceholders(editedLine.substring(scanPos));
                newSegmentContent = rebuilt;
            }
        }
    } catch (error) {
        console.warn('セグメント・変数更新エラー:', error);
        newSegmentContent = editedLine;
    }
    return { updatedVariables, newSegmentContent };
};


/**
 * プレビュー編集からセグメントと変数を同期更新
 * プレビューテキストエリアでの編集内容を元に、セグメント内容と変数値の両方を適切に更新
 *
 * 仕様（重要）:
 * - 行の増減が1行のみのときは、複雑な推定を避け、以下の安全動作に限定する
 *   - +1行（改行）: カーソル行の直後に空セグメントを挿入する
 *   - -1行（行削除）: カーソル行（または推定位置）のセグメントを削除する
 *   これにより、変数や他行への不要な影響を避ける
 *
 * @param {string} editedPreview - 編集されたプレビューテキスト
 * @param {Array} currentVariables - 現在の変数配列
 * @param {Array} currentSegments - 現在のセグメント配列
 * @param {number} [cursorLineIndex] - テキストエリアのキャレットから推定したカーソル行番号（0始まり）
 * @returns {Object} 更新された変数とセグメントのオブジェクト {variables, segments}
 */
const updateSegmentsAndVariablesFromPreview = (editedPreview, currentVariables, currentSegments, cursorLineIndex) => {
    const editedLines = String(editedPreview ?? '').split('\n');
    const updatedVariables = Array.isArray(currentVariables) ? currentVariables.slice() : [];
    let updatedSegments = Array.isArray(currentSegments) ? currentSegments.slice() : [];
    const currentPreviewLines = (Array.isArray(currentSegments) ? currentSegments : []).map(segment => {
        let content = String(segment.content || '');
        currentVariables.forEach(variable => {
            const nameEsc = (window.Helpers && typeof window.Helpers.escapeRegExp === 'function')
                ? window.Helpers.escapeRegExp(String(variable.name || ''))
                : String(variable.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\{\\{\\s*${nameEsc}\\s*\\}}`, 'g');
            content = content.replace(regex, variable.value || `{{${variable.name}}}`);
        });
        return content;
    });
    if (editedLines.length === currentSegments.length + 1) {
        const currLen = currentSegments.length;
        const editLen = editedLines.length;
        let pref = 0;
        while (pref < currLen && pref < editLen && (currentPreviewLines[pref] || '') === (editedLines[pref] || '')) {
            pref += 1;
        }
        let currEnd = currLen - 1;
        let editEnd = editLen - 1;
        while (currEnd >= pref && editEnd >= pref && (currentPreviewLines[currEnd] || '') === (editedLines[editEnd] || '')) {
            currEnd -= 1;
            editEnd -= 1;
        }
        const splitIndex = Math.max(0, Math.min(pref, currLen - 1));
        const segmentToSplit = currentSegments[splitIndex];
        const currentLineAtSplit = String(currentPreviewLines[splitIndex] || '');
        const leftLine = String(editedLines[splitIndex] || '');
        const rightLine = String(editedLines[splitIndex + 1] || '');
        const variablesInLine = [];
        currentVariables.forEach(v => {
            if (segmentToSplit && String(segmentToSplit.content || '').includes(`{{${v.name}}}`)) variablesInLine.push(v);
        });
        const isPureSplit = (currentLineAtSplit === (leftLine + rightLine));
        if (variablesInLine.length === 0 && isPureSplit) {
            const nextSegments = [...currentSegments];
            nextSegments[splitIndex] = { ...segmentToSplit, content: leftLine };
            nextSegments.splice(splitIndex + 1, 0, { id: (window.Helpers && window.Helpers.generateId ? window.Helpers.generateId() : Math.random().toString(36).slice(2)), content: rightLine });
            return { variables: updatedVariables, segments: nextSegments };
        }
        let pos = typeof cursorLineIndex === 'number' && Number.isFinite(cursorLineIndex)
            ? Math.max(0, Math.min(cursorLineIndex, currentSegments.length))
            : (splitIndex + 1);
        const segmentsWithEmpty = [...currentSegments];
        segmentsWithEmpty.splice(pos, 0, { id: (window.Helpers && window.Helpers.generateId ? window.Helpers.generateId() : Math.random().toString(36).slice(2)), content: '' });
        return { variables: updatedVariables, segments: segmentsWithEmpty };
    }
    if (editedLines.length === currentSegments.length - 1) {
        const currLen = currentSegments.length;
        const editLen = editedLines.length;
        let pref = 0;
        while (pref < editLen && (currentPreviewLines[pref] || '') === (editedLines[pref] || '')) {
            pref += 1;
        }
        let currEnd = currLen - 1;
        let editEnd = editLen - 1;
        while (currEnd >= pref && editEnd >= pref && (currentPreviewLines[currEnd] || '') === (editedLines[editEnd] || '')) {
            currEnd -= 1;
            editEnd -= 1;
        }
        let deleteIndex = Math.max(0, Math.min(pref, currLen - 1));
        if (typeof cursorLineIndex === 'number' && Number.isFinite(cursorLineIndex)) {
            const ci = Math.max(0, Math.min(cursorLineIndex, currLen - 1));
            const nextIsEmpty = (ci + 1 < currLen) && (String(currentPreviewLines[ci + 1] || '') === '');
            const caretLineUnchanged = (String(currentPreviewLines[ci] || '') === String(editedLines[Math.min(ci, editLen - 1)] || ''));
            if (nextIsEmpty && caretLineUnchanged) {
                deleteIndex = ci + 1;
            } else if (String(currentPreviewLines[ci] || '') === '') {
                deleteIndex = ci;
            }
        }
        const segmentsWithoutOne = [...currentSegments];
        segmentsWithoutOne.splice(deleteIndex, 1);
        return { variables: updatedVariables, segments: segmentsWithoutOne };
    }
    if (editedLines.length !== currentSegments.length) {
        if (editedLines.length > currentSegments.length) {
            for (let i = currentSegments.length; i < editedLines.length; i++) {
                updatedSegments.push({ id: (window.Helpers && window.Helpers.generateId ? window.Helpers.generateId() : Math.random().toString(36).slice(2)), content: editedLines[i] });
            }
        } else {
            updatedSegments = updatedSegments.slice(0, editedLines.length);
        }
    }
    const maxLines = Math.max(editedLines.length, currentPreviewLines.length);
    for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
        const editedLine = editedLines[lineIndex] || '';
        const currentLine = currentPreviewLines[lineIndex] || '';
        const segment = updatedSegments[lineIndex];
        if (!segment) continue;
        if (editedLine !== currentLine) {
            const variablesInLine = [];
            currentVariables.forEach(variable => {
                if (segment.content.includes(`{{${variable.name}}}`)) variablesInLine.push(variable);
            });
            if (variablesInLine.length > 0 && String(editedLine).trim() === '') {
                updatedSegments[lineIndex] = { ...segment, content: '' };
                continue;
            }
            if (variablesInLine.length === 0) {
                updatedSegments[lineIndex] = { ...segment, content: editedLine };
            } else {
                const result = updateSegmentWithVariables(
                    segment.content,
                    variablesInLine,
                    currentLine,
                    editedLine,
                    updatedVariables
                );
                result.updatedVariables.forEach(({ variableId, newValue }) => {
                    const variableIndex = updatedVariables.findIndex(v => v.id === variableId);
                    if (variableIndex !== -1) {
                        updatedVariables[variableIndex] = { ...updatedVariables[variableIndex], value: newValue };
                    }
                });
                if (result.newSegmentContent !== null) {
                    updatedSegments[lineIndex] = { ...segment, content: result.newSegmentContent };
                }
            }
        }
    }
    return { variables: updatedVariables, segments: updatedSegments };
};


// 公開（最小限のAPIに整理）
window.Helpers = Object.assign(window.Helpers || {}, {
    updateSegmentsAndVariablesFromPreview
});


