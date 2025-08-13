/**
 * プレビュー同期コア
 * - 単一/複数変数の値抽出
 * - 変数を含むセグメントの更新
 * - プレビュー編集→セグメント/変数同期更新
 * - レガシー同期関数の保持
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
                    const partialAfter = afterVariable.substring(0, Math.min(3, afterVariable.length));
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
 * 複数変数の値を抽出
 * 複数の変数を含む行から各変数の新しい値を推定
 *
 * @param {string} segmentContent - セグメントの内容
 * @param {Array} variablesInLine - この行に含まれる変数配列
 * @param {string} currentLine - 現在の行（変数が置換済み）
 * @param {string} editedLine - 編集された行
 * @returns {Array} 更新された変数値の配列 [{variableId, newValue}, ...]
 */
const extractMultipleVariableValues = (segmentContent, variablesInLine, currentLine, editedLine) => {
    const updatedValues = [];
    try {
        for (const variable of variablesInLine) {
            const oldValue = variable.value || '';
            if (oldValue && currentLine.includes(oldValue) && !editedLine.includes(oldValue)) {
                const singleVarValue = extractSingleVariableValue(
                    segmentContent.replace(
                        new RegExp(`{{(?!${variable.name}})([^}]+)}}`, 'g'),
                        (match, name) => {
                            const otherVar = variablesInLine.find(v => v.name === name);
                            return otherVar ? otherVar.value || match : match;
                        }
                    ),
                    variable.name,
                    editedLine
                );
                if (singleVarValue !== null) {
                    updatedValues.push({ variableId: variable.id, newValue: singleVarValue });
                    break;
                }
            }
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
            const newValue = extractSingleVariableValue(segmentContent, variable.name, editedLine);
            if (newValue !== null && newValue !== variable.value) {
                updatedVariables.push({ variableId: variable.id, newValue });
            }
            const variablePattern = `{{${variable.name}}}`;
            const variableIndex = segmentContent.indexOf(variablePattern);
            if (variableIndex !== -1) {
                const beforeVar = segmentContent.substring(0, variableIndex);
                const afterVar = segmentContent.substring(variableIndex + variablePattern.length);
                const currentValue = variable.value || '';
                const newVariableValue = extractSingleVariableValue(segmentContent, variable.name, editedLine);
                let targetValue = newVariableValue;
                if (targetValue === null || targetValue === '') targetValue = currentValue;
                if (targetValue && targetValue !== '') {
                    let valueIndex = editedLine.indexOf(targetValue);
                    if (valueIndex === -1 && currentValue && currentValue !== targetValue) {
                        valueIndex = editedLine.indexOf(currentValue);
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
                            const afterIndex = editedLine.indexOf(afterVar, estimatedStart);
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
            const extractedValues = extractMultipleVariableValues(
                segmentContent,
                variablesInLine,
                currentLine,
                editedLine
            );
            updatedVariables.push(...extractedValues);
        }
    } catch (error) {
        console.warn('セグメント・変数更新エラー:', error);
        newSegmentContent = editedLine;
    }
    return { updatedVariables, newSegmentContent };
};

/**
 * 改善された変数値同期システム
 * プレビュー編集から変数値の変更を確実に検出・同期
 *
 * @param {string} editedPreview - 編集されたプレビューテキスト
 * @param {Array} variables - 現在の変数配列
 * @param {Array} segments - セグメント配列
 * @returns {Array} 更新された変数配列
 */
const updateVariablesFromPreview = (editedPreview, variables, segments) => {
    const editedLines = String(editedPreview ?? '').split('\n');
    const updatedVariables = Array.isArray(variables) ? variables.slice() : [];
    const currentPreviewLines = (Array.isArray(segments) ? segments : []).map(segment => {
        let content = String((segment && segment.content) || '');
        (Array.isArray(variables) ? variables : []).forEach(variable => {
            const regex = new RegExp(`{{${variable.name}}}`, 'g');
            content = content.replace(regex, variable.value || `{{${variable.name}}}`);
        });
        return content;
    });
    for (let lineIndex = 0; lineIndex < Math.min(editedLines.length, currentPreviewLines.length, segments.length); lineIndex++) {
        const editedLine = editedLines[lineIndex];
        const currentLine = currentPreviewLines[lineIndex];
        const segment = segments[lineIndex];
        if (editedLine !== currentLine) {
            const variablesInLine = [];
            variables.forEach(variable => {
                if (segment.content.includes(`{{${variable.name}}}`)) variablesInLine.push(variable);
            });
            if (variablesInLine.length === 1) {
                const variable = variablesInLine[0];
                const newValue = extractSingleVariableValue(segment.content, variable.name, editedLine);
                if (newValue !== null && newValue !== variable.value) {
                    const variableIndex = updatedVariables.findIndex(v => v.id === variable.id);
                    if (variableIndex !== -1) {
                        updatedVariables[variableIndex] = { ...updatedVariables[variableIndex], value: newValue };
                    }
                }
            } else if (variablesInLine.length > 1) {
                const updatedValues = extractMultipleVariableValues(
                    segment.content,
                    variablesInLine,
                    currentLine,
                    editedLine
                );
                updatedValues.forEach(({ variableId, newValue }) => {
                    const variableIndex = updatedVariables.findIndex(v => v.id === variableId);
                    if (variableIndex !== -1) {
                        updatedVariables[variableIndex] = { ...updatedVariables[variableIndex], value: newValue };
                    }
                });
            }
        }
    }
    return updatedVariables;
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
            const regex = new RegExp(`{{${variable.name}}}`, 'g');
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

/**
 * レガシー: プレビュー編集から変数値の変更を検出・同期（旧版）
 * 互換性のために保持
 */
const syncVariablesFromPreviewEdit = (editedPreview, originalPreview, variables, segments) => {
    const editedLines = String(editedPreview ?? '').split('\n');
    const originalLines = String(originalPreview ?? '').split('\n');
    const updatedVariables = [...variables];
    const updatedSegments = [...segments];
    originalLines.forEach((originalLine, lineIndex) => {
        const editedLine = editedLines[lineIndex] || '';
        if (originalLine !== editedLine && lineIndex < segments.length) {
            const segment = segments[lineIndex];
            const variablesInSegment = [];
            variables.forEach(variable => {
                const regex = new RegExp(`{{${variable.name}}}`, 'g');
                if (regex.test(segment.content)) variablesInSegment.push(variable);
            });
            if (variablesInSegment.length === 1) {
                const variable = variablesInSegment[0];
                const oldValue = variable.value || '';
                let templateText = segment.content;
                templateText = templateText.replace(new RegExp(`{{${variable.name}}}`, 'g'), '__VARIABLE_PLACEHOLDER__');
                const newValue = editedLine.replace(
                    templateText.replace('__VARIABLE_PLACEHOLDER__', '(.*)'),
                    '$1'
                );
                if (newValue !== oldValue && newValue !== editedLine) {
                    const variableIndex = updatedVariables.findIndex(v => v.id === variable.id);
                    if (variableIndex !== -1) {
                        updatedVariables[variableIndex] = { ...updatedVariables[variableIndex], value: newValue };
                    }
                }
            } else if (variablesInSegment.length > 1) {
                variablesInSegment.forEach(variable => {
                    const oldValue = variable.value || '';
                    if (oldValue && editedLine.includes(oldValue)) return;
                });
            }
        }
    });
    if (editedLines.length > originalLines.length) {
        for (let i = originalLines.length; i < editedLines.length; i++) {
            updatedSegments.push({ id: (window.Helpers && window.Helpers.generateId ? window.Helpers.generateId() : Math.random().toString(36).slice(2)), content: editedLines[i] });
        }
    }
    if (editedLines.length < originalLines.length) {
        updatedSegments.splice(editedLines.length);
    }
    return { updatedVariables, updatedSegments };
};

// 公開
window.Helpers = Object.assign(window.Helpers || {}, {
    extractSingleVariableValue,
    extractMultipleVariableValues,
    updateSegmentWithVariables,
    updateVariablesFromPreview,
    updateSegmentsAndVariablesFromPreview,
    syncVariablesFromPreviewEdit
});


