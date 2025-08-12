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

    /**
     * クリアボタンクリックハンドラ
     * 入力フィールド右端のゴミ箱アイコン押下で値を空文字にする。
     *
     * @returns {void}
     */
    const handleClearClick = React.useCallback(() => {
        onChange({ ...variable, value: '' });
    }, [variable, onChange]);

    return React.createElement('div', { className: 'relative group' },
        React.createElement('input', {
            type: "text",
            value: variable.value || '',
            onChange: handleTextChange,
            className: "w-full pr-8 px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
            placeholder: `${variable.name}を入力`
        }),
        React.createElement('button', {
            type: 'button',
            tabIndex: -1,
            title: '入力内容をクリア',
            'aria-label': '入力内容をクリア',
            onMouseDown: (e) => { try { e.preventDefault(); } catch (_) {} },
            onClick: handleClearClick,
            className: 'absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity',
        },
            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' })
            )
        )
    );
});

// 表示名の設定（デバッグ用）
VariableInput.displayName = 'VariableInput';

/**
 * グローバルスコープへの公開
 * モジュラー構成でのコンポーネント参照を可能にする
 */
window.Components = window.Components || {};
window.Components.VariableInput = VariableInput;