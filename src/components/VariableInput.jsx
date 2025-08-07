/**
 * 変数入力コンポーネント
 * 変数のタイプに応じて適切な入力インターフェースを提供
 *
 * 対応タイプ:
 * - time: 時刻入力（フォーマット指定、丸め設定対応）
 * - text: テキスト入力（デフォルト）
 *
 * @param {Object} variable - 変数オブジェクト
 * @param {Function} onChange - 変更時のコールバック関数
 */
const VariableInput = ({ variable, onChange }) => {
    /**
     * 時刻タイプの入力処理
     * フォーマット文字列を解析して分割された入力フィールドを生成
     */
    if (variable.type === 'time') {
        // フォーマットをパーツと区切り文字に分割
        const parts = variable.format.split(/[^YMDHms]+/);
        const separators = variable.format.match(/[^YMDHms]+/g) || [];

        return React.createElement('div', { className: "space-y-2" },
            React.createElement('div', { className: "flex items-center gap-1" },
                parts.map((part, i) =>
                    React.createElement(React.Fragment, { key: i },
                        React.createElement('input', {
                            type: "text",
                            value: variable.value?.split(/[^0-9]+/)[i] || '',
                            onChange: (e) => {
                                // 各フィールドの値を結合して最終的な値を構成
                                const values = variable.value?.split(/[^0-9]+/) || [];
                                values[i] = e.target.value;
                                const newValue = values.reduce((acc, val, idx) => {
                                    return acc + val + (separators[idx] || '');
                                }, '');
                                onChange({ ...variable, value: newValue });
                            },
                            className: "w-16 px-2 py-1 bg-gray-700 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500",
                            placeholder: part
                        }),
                        i < separators.length && React.createElement('span', { className: "text-gray-400" }, separators[i])
                    )
                )
            ),
            // リアルタイムプレビューを表示
            React.createElement('div', { className: "text-xs text-gray-400" },
                'プレビュー: ', DateUtils.formatDateTime(new Date(), variable.format, variable.rounding)
            )
        );
    }

    /**
     * テキストタイプの入力処理（デフォルト）
     */
    return React.createElement('input', {
        type: "text",
        value: variable.value,
        onChange: (e) => onChange({ ...variable, value: e.target.value }),
        className: "w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
        placeholder: `${variable.name}を入力`
    });
};

/**
 * グローバルスコープへの公開
 * モジュラー構成でのコンポーネント参照を可能にする
 */
window.Components = window.Components || {};
window.Components.VariableInput = VariableInput;