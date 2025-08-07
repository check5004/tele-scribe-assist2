/**
 * 汎用ヘルパー関数
 * アプリケーション全体で使用される汎用的なユーティリティ関数を提供
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
 * グローバルスコープへの公開
 * モジュラー構成でのヘルパー関数参照を可能にする
 */
window.Helpers = {
    generateId,
    analyzeVariableUsage,
    analyzeVariableDeletionImpact
};