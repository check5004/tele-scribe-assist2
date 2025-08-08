/**
 * 変数入力コンポーネント
 * 変数のタイプに応じて適切な入力インターフェースを提供
 *
 * 対応タイプ:
 * - time: 時刻入力（TimeInputコンポーネントに委譲）
 * - phone: 電話番号入力（PhoneInputコンポーネントに委譲）
 * - text: テキスト入力（デフォルト）
 *
 * 設計思想:
 * - 各変数タイプ専用のコンポーネントに処理を委譲
 * - シンプルなルーティング機能のみを担当
 * - 複雑なロジックは専用コンポーネントで実装
 *
 * @param {Object} props - コンポーネントのプロパティ
 * @param {Object} props.variable - 変数オブジェクト
 * @param {Function} props.onChange - 変更時のコールバック関数
 * @returns {JSX.Element} 適切な入力コンポーネントのJSX要素
 */
const VariableInput = React.memo(({ variable, onChange }) => {
    /**
     * 時刻タイプの場合はTimeInputコンポーネントに委譲
     */
    if (variable.type === 'time') {
        return React.createElement(Components.TimeInput, {
            variable: variable,
            onChange: onChange
        });
    }

    /**
     * 電話番号タイプの場合はPhoneInputコンポーネントに委譲
     */
    if (variable.type === 'phone') {
        return React.createElement(Components.PhoneInput, {
            variable: variable,
            onChange: onChange
        });
    }

    /**
     * テキストタイプの入力処理（デフォルト）
     * シンプルなテキスト入力フィールドを提供
     */
    const handleTextChange = React.useCallback((e) => {
        onChange({ ...variable, value: e.target.value });
    }, [variable, onChange]);

    return React.createElement('input', {
        type: "text",
        value: variable.value || '',
        onChange: handleTextChange,
        className: "w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
        placeholder: `${variable.name}を入力`
    });
});

// 表示名の設定（デバッグ用）
VariableInput.displayName = 'VariableInput';

/**
 * グローバルスコープへの公開
 * モジュラー構成でのコンポーネント参照を可能にする
 */
window.Components = window.Components || {};
window.Components.VariableInput = VariableInput;