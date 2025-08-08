/**
 * 汎用ヘルパー関数
 * アプリケーション全体で使用される汎用的なユーティリティ関数を提供
 */

/**
 * 日本の電話番号フォーマッタ
 * 入力から数字のみを抽出し、日本の一般的な電話番号規則に基づいてハイフンを自動挿入する
 *
 * 対応例:
 * - 携帯電話/データ通信: 070/080/090/020/050 先頭の11桁 → 3-4-4
 * - フリーダイヤル: 0120 先頭の10桁 → 4-3-3
 * - ナビダイヤル: 0570 先頭の10桁 → 4-3-3
 * - 0800（フリーコール）: 0800 先頭の11桁 → 4-3-4
 * - 固定電話（東京/大阪）: 03/06 先頭の10桁 → 2-4-4
 * - 固定電話（その他・簡易ルール）: 先頭0かつ10桁 → 3-3-4
 * - 上記以外や桁数が適合しない場合 → ハイフンなし（数字のみ）を返す
 *
 * 注意:
 * - 完全な市外局番辞書を持たない簡易実装。主要なパターンを優先的に整形する。
 *
 * @param {string} input - 入力文字列（数字以外が含まれていてもよい）
 * @returns {string} ハイフン整形済みの電話番号文字列（不適合時は数字のみ）
 */
const formatJapanesePhone = (input) => {
    // 全角数字を半角にし、非数字を除去
    const normalized = String(input ?? '').replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    const digits = normalized.replace(/\D/g, '');
    if (digits.length === 0) return '';

    // 1) ライブラリ優先（libphonenumber-js が存在する場合）
    try {
        if (typeof window !== 'undefined' && window.libphonenumber) {
            const asYouType = new window.libphonenumber.AsYouType('JP');
            asYouType.input(digits);
            const formatted = asYouType.formattedOutput || asYouType.getNumberValue() || '';
            if (formatted) {
                // formatted はハイフン入りのことが多い。なければ自前フォールバックへ。
                // 余計な空白を除去
                return String(formatted).trim();
            }
        }
    } catch (_) { /* フォールバックへ */ }

    // 2) フォールバック: 主要パターンルール
    // 特番系
    if (digits.startsWith('0120') && digits.length === 10) {
        return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    if (digits.startsWith('0570') && digits.length === 10) {
        return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    if (digits.startsWith('0800') && digits.length === 11) {
        return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }

    // 携帯・IP・M2M 等（11桁）
    const mobilePrefixes = ['070', '080', '090', '050', '020'];
    if (mobilePrefixes.some(p => digits.startsWith(p)) && digits.length === 11) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }

    // 固定電話（主要）
    if ((digits.startsWith('03') || digits.startsWith('06')) && digits.length === 10) {
        return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    // 固定電話（簡易既定）
    if (digits.length === 10 && digits.startsWith('0')) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // 既定（11桁は 3-4-4 で整形）
    if (digits.length === 11) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }

    // 不明: ハイフンなしで返す
    return digits;
};

/**
 * 変数名からタイプを推定
 * 現状は電話関連（TEL/電話）のみ 'phone' とし、それ以外は 'text'
 *
 * @param {string} name - 変数名
 * @returns {('phone'|'text')} 推定されたタイプ
 */
const guessVariableTypeByName = (name) => {
    const n = String(name || '').trim();
    const upper = n.toUpperCase();
    if (upper === 'TEL' || upper.startsWith('TEL') || n.includes('電話')) {
        return 'phone';
    }
    return 'text';
};

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
 * 変数使用状況分析関数
 * セグメント配列内での各変数の使用状況を分析し、詳細情報を返す
 *
 * @param {Array} variables - 変数配列
 * @param {Array} segments - セグメント配列
 * @returns {Object} 変数使用状況オブジェクト
 * @returns {Array} returns.unusedVariables - 未使用変数のIDリスト
 * @returns {Array} returns.usedVariables - 使用中変数のIDリスト
 * @returns {Object} returns.variableUsage - 変数IDをキーとした使用状況詳細
 */
const analyzeVariableUsage = (variables, segments) => {
    const variableUsage = {};
    const usedVariables = [];
    const unusedVariables = [];

    // 各変数の使用状況を初期化
    variables.forEach(variable => {
        variableUsage[variable.id] = {
            name: variable.name,
            usedInSegments: [],
            isUsed: false
        };
    });

    // セグメント内での変数使用を検出
    segments.forEach((segment, segmentIndex) => {
        variables.forEach(variable => {
            const regex = new RegExp(`{{${variable.name}}}`, 'g');
            if (regex.test(segment.content)) {
                variableUsage[variable.id].usedInSegments.push({
                    segmentIndex,
                    segmentId: segment.id,
                    content: segment.content
                });
                variableUsage[variable.id].isUsed = true;

                // 使用中変数リストに追加（重複を避ける）
                if (!usedVariables.includes(variable.id)) {
                    usedVariables.push(variable.id);
                }
            }
        });
    });

    // 未使用変数リストを作成
    variables.forEach(variable => {
        if (!variableUsage[variable.id].isUsed) {
            unusedVariables.push(variable.id);
        }
    });

    return {
        unusedVariables,
        usedVariables,
        variableUsage
    };
};

/**
 * 変数削除時の影響確認関数
 * 指定された変数を削除した際の影響を調べ、警告メッセージを生成
 *
 * @param {string} variableId - 削除対象変数のID
 * @param {Array} variables - 変数配列
 * @param {Array} segments - セグメント配列
 * @returns {Object} 削除影響分析結果
 * @returns {boolean} returns.canDelete - 削除可能かどうか
 * @returns {string} returns.warningMessage - 警告メッセージ
 * @returns {Array} returns.affectedSegments - 影響を受けるセグメント詳細
 */
const analyzeVariableDeletionImpact = (variableId, variables, segments) => {
    const variable = variables.find(v => v.id === variableId);
    if (!variable) {
        return {
            canDelete: true,
            warningMessage: '',
            affectedSegments: []
        };
    }

    const usage = analyzeVariableUsage(variables, segments);
    const variableInfo = usage.variableUsage[variableId];

    if (!variableInfo.isUsed) {
        return {
            canDelete: true,
            warningMessage: '',
            affectedSegments: []
        };
    }

    const affectedSegments = variableInfo.usedInSegments;
    const warningMessage = `変数「${variable.name}」は${affectedSegments.length}箇所で使用されています。\n\n削除すると以下のセグメントに影響します：\n${affectedSegments.map((seg, index) => `${index + 1}. ${seg.content}`).join('\n')}\n\n本当に削除しますか？`;

    return {
        canDelete: false, // 警告が必要
        warningMessage,
        affectedSegments
    };
};

/**
 * 変数値同期システム
 * プレビュー編集時に変数値を自動的に同期し、変数参照を保持する
 */

/**
 * プレビュー編集から変数値の変更を検出・同期
 * 編集されたプレビューと元のプレビューを比較して変数値の変更を検出し、
 * 変数配列を更新する
 *
 * @param {string} editedPreview - 編集されたプレビューテキスト
 * @param {string} originalPreview - 元のプレビューテキスト
 * @param {Array} variables - 現在の変数配列
 * @param {Array} segments - セグメント配列
 * @returns {Object} 同期結果
 * @returns {Array} returns.updatedVariables - 更新された変数配列
 * @returns {Array} returns.updatedSegments - 更新されたセグメント配列
 */
const syncVariablesFromPreviewEdit = (editedPreview, originalPreview, variables, segments) => {
    const editedLines = editedPreview.split('\n');
    const originalLines = originalPreview.split('\n');
    const updatedVariables = [...variables];
    const updatedSegments = [...segments];

    // 各行を比較して変数値の変更を検出
    originalLines.forEach((originalLine, lineIndex) => {
        const editedLine = editedLines[lineIndex] || '';

        if (originalLine !== editedLine && lineIndex < segments.length) {
            // この行に含まれる変数を特定
            const segment = segments[lineIndex];
            const variablesInSegment = [];

            variables.forEach(variable => {
                const regex = new RegExp(`{{${variable.name}}}`, 'g');
                if (regex.test(segment.content)) {
                    variablesInSegment.push(variable);
                }
            });

            // 変数値の変更を検出して更新
            if (variablesInSegment.length === 1) {
                // 単一変数の場合：確実に値を特定可能
                const variable = variablesInSegment[0];
                const oldValue = variable.value || '';

                // 元の行から変数部分以外のテキストを取得
                let templateText = segment.content;
                templateText = templateText.replace(new RegExp(`{{${variable.name}}}`, 'g'), '__VARIABLE_PLACEHOLDER__');

                // 編集された行から新しい変数値を抽出
                const newValue = editedLine.replace(
                    templateText.replace('__VARIABLE_PLACEHOLDER__', '(.*)'),
                    '$1'
                );

                if (newValue !== oldValue && newValue !== editedLine) {
                    // 変数値を更新
                    const variableIndex = updatedVariables.findIndex(v => v.id === variable.id);
                    if (variableIndex !== -1) {
                        updatedVariables[variableIndex] = {
                            ...updatedVariables[variableIndex],
                            value: newValue
                        };
                    }
                }
            } else if (variablesInSegment.length > 1) {
                // 複数変数の場合：より複雑な解析が必要
                // 簡易実装：最初に見つかった値の違いを最初の変数に適用
                variablesInSegment.forEach(variable => {
                    const oldValue = variable.value || '';
                    if (oldValue && editedLine.includes(oldValue)) {
                        // 既存の値が残っている場合は変更なし
                        return;
                    }

                    // 簡易的な値推定（改良の余地あり）
                    const variableIndex = updatedVariables.findIndex(v => v.id === variable.id);
                    if (variableIndex !== -1) {
                        // ここでは詳細な推定ロジックは省略
                        // 実際の実装では差分解析を行う
                    }
                });
            }
        }
    });

    // 新しい行が追加された場合
    if (editedLines.length > originalLines.length) {
        for (let i = originalLines.length; i < editedLines.length; i++) {
            updatedSegments.push({
                id: generateId(),
                content: editedLines[i]
            });
        }
    }

    // 行が削除された場合
    if (editedLines.length < originalLines.length) {
        updatedSegments.splice(editedLines.length);
    }

    return {
        updatedVariables,
        updatedSegments
    };
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
    const editedLines = editedPreview.split('\n');
    const updatedVariables = [...variables];

    // 現在のプレビューを生成（比較用）
    const currentPreviewLines = segments.map(segment => {
        let content = segment.content;
        variables.forEach(variable => {
            const regex = new RegExp(`{{${variable.name}}}`, 'g');
            content = content.replace(regex, variable.value || `{{${variable.name}}}`);
        });
        return content;
    });

    // 各行を比較して変数値の変更を検出
    for (let lineIndex = 0; lineIndex < Math.min(editedLines.length, currentPreviewLines.length, segments.length); lineIndex++) {
        const editedLine = editedLines[lineIndex];
        const currentLine = currentPreviewLines[lineIndex];
        const segment = segments[lineIndex];

        if (editedLine !== currentLine) {
            // この行に含まれる変数を特定
            const variablesInLine = [];
            variables.forEach(variable => {
                if (segment.content.includes(`{{${variable.name}}}`)) {
                    variablesInLine.push(variable);
                }
            });

            if (variablesInLine.length === 1) {
                // 単一変数の場合：確実に処理可能
                const variable = variablesInLine[0];
                const newValue = extractSingleVariableValue(segment.content, variable.name, editedLine);

                if (newValue !== null && newValue !== variable.value) {
                    const variableIndex = updatedVariables.findIndex(v => v.id === variable.id);
                    if (variableIndex !== -1) {
                        updatedVariables[variableIndex] = {
                            ...updatedVariables[variableIndex],
                            value: newValue
                        };
                    }
                }
            } else if (variablesInLine.length > 1) {
                // 複数変数の場合：差分解析アプローチ
                const updatedValues = extractMultipleVariableValues(
                    segment.content,
                    variablesInLine,
                    currentLine,
                    editedLine
                );

                updatedValues.forEach(({ variableId, newValue }) => {
                    const variableIndex = updatedVariables.findIndex(v => v.id === variableId);
                    if (variableIndex !== -1) {
                        updatedVariables[variableIndex] = {
                            ...updatedVariables[variableIndex],
                            value: newValue
                        };
                    }
                });
            }
        }
    }

    return updatedVariables;
};

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

        if (variableIndex === -1) {
            return null;
        }

        // セグメント内の変数の前後の固定テキストを取得
        const beforeVariable = segmentContent.substring(0, variableIndex);
        const afterVariable = segmentContent.substring(variableIndex + variablePattern.length);

        // 編集された行で前後の固定テキストの位置を探す
        let startIndex = 0;
        let endIndex = editedLine.length;

        // 前の固定テキストが存在する場合、その終了位置を特定
        if (beforeVariable) {
            const beforeIndex = editedLine.indexOf(beforeVariable);
            if (beforeIndex === -1) {
                // 前の固定テキストが見つからない場合は失敗
                return null;
            }
            startIndex = beforeIndex + beforeVariable.length;
        }

        // 後の固定テキストが存在する場合、その開始位置を特定（変数境界を1文字広げて判定）
        if (afterVariable) {
            // まず正確な位置を探す
            let afterIndex = editedLine.indexOf(afterVariable, startIndex);

            // 見つからない場合は、変数の最後の1文字を含めて再試行
            if (afterIndex === -1 && startIndex < editedLine.length) {
                // 変数値の最後の1文字を含めた範囲で後の固定テキストを探す
                for (let i = startIndex; i <= editedLine.length; i++) {
                    afterIndex = editedLine.indexOf(afterVariable, i);
                    if (afterIndex !== -1) {
                        break;
                    }
                }
            }

            // それでも見つからない場合は、より寛容な検索を実行
            if (afterIndex === -1) {
                // 後の固定テキストの最初の部分だけでも一致するかチェック
                if (afterVariable.length > 1) {
                    const partialAfter = afterVariable.substring(0, Math.min(3, afterVariable.length));
                    afterIndex = editedLine.indexOf(partialAfter, startIndex);
                    if (afterIndex !== -1) {
                        // 部分一致の場合は、元の後の固定テキストの長さを考慮
                        endIndex = afterIndex;
                    } else {
                        // 完全に見つからない場合は行の最後まで
                        endIndex = editedLine.length;
                    }
                } else {
                    endIndex = editedLine.length;
                }
            } else {
                endIndex = afterIndex;
            }
        }

        // 変数値を抽出
        const extractedValue = editedLine.substring(startIndex, endIndex);

        // 空文字列の場合も有効な値として返す（全削除の場合を考慮）
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
        // 簡易的な実装：最初に変更を検出した変数のみ更新
        // より高度な実装では全ての変数の組み合わせを試行する

        for (const variable of variablesInLine) {
            const oldValue = variable.value || '';

            // この変数が変更されたかチェック
            if (oldValue && currentLine.includes(oldValue) && !editedLine.includes(oldValue)) {
                // 変数の値が変更された可能性
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
                    updatedValues.push({
                        variableId: variable.id,
                        newValue: singleVarValue
                    });
                    break; // 一つずつ処理
                }
            }
        }
    } catch (error) {
        console.warn('複数変数値抽出エラー:', error);
    }

    return updatedValues;
};

/**
 * プレビュー編集からセグメントと変数を同期更新
 * プレビューテキストエリアでの編集内容を元に、セグメント内容と変数値の両方を適切に更新
 *
 * @param {string} editedPreview - 編集されたプレビューテキスト
 * @param {Array} currentVariables - 現在の変数配列
 * @param {Array} currentSegments - 現在のセグメント配列
 * @returns {Object} 更新された変数とセグメントのオブジェクト {variables, segments}
 */
const updateSegmentsAndVariablesFromPreview = (editedPreview, currentVariables, currentSegments) => {
    const editedLines = editedPreview.split('\n');
    const updatedVariables = [...currentVariables];
    let updatedSegments = [...currentSegments];

    // 現在のプレビューを生成（比較用）
    const currentPreviewLines = currentSegments.map(segment => {
        let content = segment.content;
        currentVariables.forEach(variable => {
            const regex = new RegExp(`{{${variable.name}}}`, 'g');
            content = content.replace(regex, variable.value || `{{${variable.name}}}`);
        });
        return content;
    });

    // 行数の調整
    if (editedLines.length !== currentSegments.length) {
        if (editedLines.length > currentSegments.length) {
            // 行が追加された場合：新しいセグメントを作成
            for (let i = currentSegments.length; i < editedLines.length; i++) {
                updatedSegments.push({
                    id: generateId(),
                    content: editedLines[i]
                });
            }
        } else {
            // 行が削除された場合：セグメント配列を切り詰め
            updatedSegments = updatedSegments.slice(0, editedLines.length);
        }
    }

    // 各行を処理
    const maxLines = Math.max(editedLines.length, currentPreviewLines.length);
    for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
        const editedLine = editedLines[lineIndex] || '';
        const currentLine = currentPreviewLines[lineIndex] || '';
        const segment = updatedSegments[lineIndex];

        if (!segment) continue;

        if (editedLine !== currentLine) {
            // この行に含まれる変数を特定
            const variablesInLine = [];
            currentVariables.forEach(variable => {
                if (segment.content.includes(`{{${variable.name}}}`)) {
                    variablesInLine.push(variable);
                }
            });

            if (variablesInLine.length === 0) {
                // 変数が含まれていない場合：セグメント内容を直接更新
                updatedSegments[lineIndex] = {
                    ...segment,
                    content: editedLine
                };
            } else {
                // 変数が含まれている場合：変数値の更新とセグメント内容の推定
                const result = updateSegmentWithVariables(
                    segment.content,
                    variablesInLine,
                    currentLine,
                    editedLine,
                    updatedVariables
                );

                // 変数値を更新
                result.updatedVariables.forEach(({ variableId, newValue }) => {
                    const variableIndex = updatedVariables.findIndex(v => v.id === variableId);
                    if (variableIndex !== -1) {
                        updatedVariables[variableIndex] = {
                            ...updatedVariables[variableIndex],
                            value: newValue
                        };
                    }
                });

                // セグメント内容を更新（必要に応じて）
                if (result.newSegmentContent !== null) {
                    updatedSegments[lineIndex] = {
                        ...segment,
                        content: result.newSegmentContent
                    };
                }
            }
        }
    }

    return {
        variables: updatedVariables,
        segments: updatedSegments
    };
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
            // 単一変数の場合：値を抽出
            const variable = variablesInLine[0];
            const newValue = extractSingleVariableValue(segmentContent, variable.name, editedLine);

            // 変数値が変更された場合（空文字列の場合も含む）
            if (newValue !== null && newValue !== variable.value) {
                updatedVariables.push({
                    variableId: variable.id,
                    newValue: newValue
                });
            }

            // セグメント内容の変更をチェック（変数以外の部分）
            const variablePattern = `{{${variable.name}}}`;
            const variableIndex = segmentContent.indexOf(variablePattern);

            if (variableIndex !== -1) {
                const beforeVar = segmentContent.substring(0, variableIndex);
                const afterVar = segmentContent.substring(variableIndex + variablePattern.length);

                                // 編集された行から変数以外の部分を正確に推定
                const currentValue = variable.value || '';
                const newVariableValue = extractSingleVariableValue(segmentContent, variable.name, editedLine);

                // 新しい変数値を使って境界を特定
                let targetValue = newVariableValue;
                if (targetValue === null || targetValue === '') {
                    // 変数が全削除された場合は、現在の値で試行
                    targetValue = currentValue;
                }

                if (targetValue && targetValue !== '') {
                    // 変数値の位置を正確に特定（新しい値を優先）
                    let valueIndex = editedLine.indexOf(targetValue);

                    // 見つからない場合は現在の値で試行
                    if (valueIndex === -1 && currentValue && currentValue !== targetValue) {
                        valueIndex = editedLine.indexOf(currentValue);
                    }

                    if (valueIndex !== -1) {
                        const editedBeforeVar = editedLine.substring(0, valueIndex);
                        const editedAfterVar = editedLine.substring(valueIndex + targetValue.length);

                        // 前後の文字列が変更されている場合のみセグメント内容を更新
                        if (editedBeforeVar !== beforeVar || editedAfterVar !== afterVar) {
                            newSegmentContent = editedBeforeVar + variablePattern + editedAfterVar;
                        }
                    } else {
                        // 変数値が見つからない場合、前後の固定テキストから推定
                        let estimatedStart = 0;
                        let estimatedEnd = editedLine.length;

                        if (beforeVar) {
                            const beforeIndex = editedLine.indexOf(beforeVar);
                            if (beforeIndex !== -1) {
                                estimatedStart = beforeIndex + beforeVar.length;
                            }
                        }

                        if (afterVar) {
                            const afterIndex = editedLine.indexOf(afterVar, estimatedStart);
                            if (afterIndex !== -1) {
                                estimatedEnd = afterIndex;
                            }
                        }

                        const estimatedBeforeVar = editedLine.substring(0, estimatedStart);
                        const estimatedAfterVar = editedLine.substring(estimatedEnd);

                        // 推定された境界でセグメント内容を更新
                        if (estimatedBeforeVar !== beforeVar || estimatedAfterVar !== afterVar) {
                            newSegmentContent = estimatedBeforeVar + variablePattern + estimatedAfterVar;
                        }
                    }
                } else {
                    // 変数値が完全に空の場合（全削除時）の処理
                    let estimatedStart = 0;
                    let estimatedEnd = editedLine.length;

                    if (beforeVar) {
                        const beforeIndex = editedLine.indexOf(beforeVar);
                        if (beforeIndex !== -1) {
                            estimatedStart = beforeIndex + beforeVar.length;
                        }
                    }

                    if (afterVar) {
                        const afterIndex = editedLine.indexOf(afterVar, estimatedStart);
                        if (afterIndex !== -1) {
                            estimatedEnd = afterIndex;
                        }
                    }

                    const estimatedBeforeVar = editedLine.substring(0, estimatedStart);
                    const estimatedAfterVar = editedLine.substring(estimatedEnd);

                    // 全削除時もセグメント境界を更新
                    if (estimatedBeforeVar !== beforeVar || estimatedAfterVar !== afterVar) {
                        newSegmentContent = estimatedBeforeVar + variablePattern + estimatedAfterVar;
                    }
                }
            }
        } else {
            // 複数変数の場合：複雑な処理は一旦保留、変数値のみ更新
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
        // エラー時は編集された行をそのままセグメント内容として設定
        newSegmentContent = editedLine;
    }

    return {
        updatedVariables,
        newSegmentContent
    };
};

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
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * グローバルスコープへの公開
 * モジュラー構成でのヘルパー関数参照を可能にする
 */
window.Helpers = {
    generateId,
    analyzeVariableUsage,
    analyzeVariableDeletionImpact,
    escapeRegExp,
    debounce,
    // 電話番号ユーティリティ
    formatJapanesePhone,
    guessVariableTypeByName,
    // 変数値同期システム（新版）
    updateSegmentsAndVariablesFromPreview,
    updateSegmentWithVariables,
    // 変数値同期システム（レガシー）
    syncVariablesFromPreviewEdit,
    updateVariablesFromPreview,
    extractSingleVariableValue,
    extractMultipleVariableValues
};