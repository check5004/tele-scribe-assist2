/**
 * 変数使用状況の分析と削除影響判定
 * - セグメント中の変数出現箇所の収集
 * - 変数削除時の影響メッセージ生成
 * 正規表現は事前生成してパフォーマンスを最適化
 */

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

    const safeSegments = Array.isArray(segments) ? segments : [];
    const safeVariables = Array.isArray(variables) ? variables : [];

    safeVariables.forEach(variable => {
        variableUsage[variable.id] = {
            name: variable.name,
            usedInSegments: [],
            isUsed: false
        };
    });

    // 正規表現を事前生成（厳密一致 {{name}}）
    const variableRegexMap = new Map();
    safeVariables.forEach(v => {
        // name 内の正規表現メタをエスケープ
        const escaped = String(v.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        variableRegexMap.set(v.id, new RegExp(`\\{\\{${escaped}\\}}`, 'g'));
    });

    safeSegments.forEach((segment, segmentIndex) => {
        const content = String((segment && segment.content) || '');
        safeVariables.forEach(variable => {
            const regex = variableRegexMap.get(variable.id);
            if (regex && regex.test(content)) {
                variableUsage[variable.id].usedInSegments.push({
                    segmentIndex,
                    segmentId: segment.id,
                    content
                });
                variableUsage[variable.id].isUsed = true;
                if (!usedVariables.includes(variable.id)) usedVariables.push(variable.id);
            }
        });
    });

    safeVariables.forEach(variable => {
        if (!variableUsage[variable.id].isUsed) unusedVariables.push(variable.id);
    });

    return { unusedVariables, usedVariables, variableUsage };
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
    const variable = (Array.isArray(variables) ? variables : []).find(v => v.id === variableId);
    if (!variable) {
        return { canDelete: true, warningMessage: '', affectedSegments: [] };
    }

    const usage = analyzeVariableUsage(variables, segments);
    const variableInfo = usage.variableUsage[variableId];

    if (!variableInfo || !variableInfo.isUsed) {
        return { canDelete: true, warningMessage: '', affectedSegments: [] };
    }

    const affectedSegments = variableInfo.usedInSegments;
    const warningMessage = `変数「${variable.name}」は${affectedSegments.length}箇所で使用されています。\n\n削除すると以下のセグメントに影響します：\n${affectedSegments.map((seg, index) => `${index + 1}. ${seg.content}`).join('\n')}\n\n本当に削除しますか？`;

    return { canDelete: false, warningMessage, affectedSegments };
};

// 公開
window.Helpers = Object.assign(window.Helpers || {}, {
    analyzeVariableUsage,
    analyzeVariableDeletionImpact
});


/**
 * テキストから未登録変数を自動追加するユーティリティ
 * `{{ 変数名 }}` 形式のプレースホルダを抽出し、既存に存在しない変数を末尾に追加する。
 * 追加がない場合は元の配列インスタンスをそのまま返す（=== 比較で検出可能）。
 *
 * 実装詳細:
 * - 変数名抽出は `window.TemplateUtils.extractVariableNames` を使用（/\{\{\s*([^}\s]+)\s*\}\}/g）
 * - タイプ推定は `window.Helpers.guessVariableTypeByName` を使用（電話系は 'phone'、他は 'text'）
 * - ID生成は `window.Helpers.generateId`
 *
 * 注意:
 * - 並び順の最適化（出現順への並べ替え）は VariablesPanel 側の表示順計算で実施しているため、
 *   本関数では配列順を変更しない（追加時は末尾）。
 *
 * @param {string|string[]} input - 対象テキストまたは行配列
 * @param {Array<{id:string,name:string,type:string,value:any}>} variables - 既存の変数配列
 * @returns {Array<{id:string,name:string,type:string,value:any}>} 追加後の変数配列（追加なしなら元配列）
 */
const addMissingVariablesFromText = (input, variables) => {
    const current = Array.isArray(variables) ? variables : [];
    let names = [];
    try {
        if (window.TemplateUtils && typeof window.TemplateUtils.extractVariableNames === 'function') {
            names = window.TemplateUtils.extractVariableNames(input);
        }
    } catch (_) { names = []; }

    if (!Array.isArray(names) || names.length === 0) return variables;

    const existing = new Set(current.map(v => String(v && v.name)));
    const toAdd = names.filter(n => !existing.has(String(n)));
    if (toAdd.length === 0) return variables;

    const next = [
        ...current,
        ...toAdd.map(name => ({
            id: (window.Helpers && typeof window.Helpers.generateId === 'function') ? window.Helpers.generateId() : Math.random().toString(36).slice(2),
            name: String(name || ''),
            type: (window.Helpers && typeof window.Helpers.guessVariableTypeByName === 'function') ? window.Helpers.guessVariableTypeByName(name) : 'text',
            value: ''
        }))
    ];
    return next;
};

// 公開拡張
window.Helpers = Object.assign(window.Helpers || {}, {
    addMissingVariablesFromText
});


