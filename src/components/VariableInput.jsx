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
 * 右半分の緑Chip（グループ候補）仕様:
 * - 入力中も `groupValues` の上位3件を曖昧検索（Helpers.fuzzyFilterAndRank）で提示
 * - 入力と候補の完全一致時はChipを非表示
 * - 入力が空のときは従来どおり先頭3件を表示
 *
 * @param {Object} props - コンポーネントのプロパティ
 * @param {Object} props.variable - 変数オブジェクト
 * @param {Function} props.onChange - 変更時のコールバック関数
 * @param {Function} [props.onCommitValue] - Blur/Chipクリック時の履歴コミット関数 (name,value,type)
 * @param {{groupValues?:string[], history?:string[]}} [props.suggestions] - Chip/履歴候補
 * @param {Function} [props.onSuggestOpen] - 下部ドロップダウン展開に伴うスクロール調整通知
 * @param {Function} [props.onSuggestClose] - 下部ドロップダウンクローズ通知
 * @returns {JSX.Element} 適切な入力コンポーネントのJSX要素
 */
const VariableInput = React.memo(({ variable, onChange, onCommitValue, suggestions, onSuggestOpen, onSuggestClose }) => {
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
            onChange: onChange,
            onCommitValue: onCommitValue,
            suggestions: suggestions,
            onSuggestOpen: onSuggestOpen,
            onSuggestClose: onSuggestClose
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
     * Blur時に値コミット
     */
    const handleBlur = React.useCallback(() => {
        try { onCommitValue && onCommitValue(variable.name, variable.value || '', variable.type || 'text'); } catch (_) {}
    }, [onCommitValue, variable]);

    /**
     * クリアボタンクリックハンドラ
     * 入力フィールド右端のゴミ箱アイコン押下で値を空文字にする。
     *
     * @returns {void}
     */
    const handleClearClick = React.useCallback(() => {
        onChange({ ...variable, value: '' });
    }, [variable, onChange]);

    const [openSuggest, setOpenSuggest] = React.useState(false);
    const dropdownRef = React.useRef(null);

    return React.createElement('div', { className: 'relative group' },
        React.createElement('input', {
            type: "text",
            value: variable.value || '',
            onChange: handleTextChange,
            onBlur: () => { try { handleBlur(); } catch (_) {} try { setTimeout(() => { setOpenSuggest(false); if (typeof onSuggestClose === 'function') onSuggestClose(); }, 120); } catch (_) {} },
            onFocus: () => { setOpenSuggest(true); try { if (typeof onSuggestOpen === 'function') onSuggestOpen(dropdownRef.current); } catch (_) {} },
            className: "w-full pr-8 px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
            placeholder: `${variable.name}を入力`
        }),
        // 右半分Chipオーバーレイ（曖昧検索で上位3件、完全一致時は非表示）
        React.createElement('div', { className: 'pointer-events-none absolute inset-y-0 right-10 w-1/2 flex items-center justify-start gap-1 pl-2 z-10 tsa-scroll-x' },
            (() => {
                const chips = [];
                const values = (suggestions && Array.isArray(suggestions.groupValues)) ? suggestions.groupValues : [];
                const inputValue = String(variable.value || '');
                const helpers = (typeof window !== 'undefined' && window.Helpers) ? window.Helpers : null;
                const ranked = (helpers && typeof helpers.fuzzyFilterAndRank === 'function')
                    ? helpers.fuzzyFilterAndRank(values, inputValue)
                    : (inputValue
                        ? values.filter(v => String(v || '').toLowerCase().includes(inputValue.toLowerCase()))
                        : values);
                const hasExactMatch = values.some(v => String(v ?? '') === inputValue);
                const toRender = (!hasExactMatch ? ranked.slice(0, 3) : []);
                toRender.forEach((val, idx) => {
                    chips.push(React.createElement('button', {
                        key: `group${idx}`,
                        type: 'button',
                        className: 'pointer-events-auto px-2 py-0.5 text-xs bg-transparent border border-emerald-400/60 text-emerald-300 hover:bg-emerald-400/10 rounded',
                        title: 'グループ候補を適用',
                        'aria-label': `${variable.name}にグループ候補を適用`,
                        onMouseDown: (e) => { try { e.preventDefault(); } catch (_) {} },
                        onClick: () => {
                            const v = String(val ?? '');
                            onChange({ ...variable, value: v });
                            try { onCommitValue && onCommitValue(variable.name, v, variable.type || 'text'); } catch (_) {}
                        }
                    }, String(val)));
                });
                return chips;
            })()
        ),
        // 下部候補ドロップダウン（通常履歴）
        (() => {
            const history = (suggestions && Array.isArray(suggestions.history)) ? suggestions.history : [];
            const inputValue = String(variable.value || '');
            const max = 5;
            const filtered = (inputValue
                ? history.filter(h => String(h || '').includes(inputValue))
                : history)
                .filter(h => String(h || '') !== inputValue);
            const toShow = filtered.slice(0, max);
            if (!openSuggest || toShow.length === 0) return null;
            return React.createElement('div', {
                ref: dropdownRef,
                className: 'absolute left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-40 max-h-48 overflow-auto'
            }, toShow.map((val, i) => React.createElement('button', {
                key: i,
                type: 'button',
                className: 'w-full text-left px-3 py-2 text-sm hover:bg-gray-700',
                onMouseDown: (e) => { try { e.preventDefault(); } catch (_) {} },
                onClick: () => {
                    const v = String(val ?? '');
                    onChange({ ...variable, value: v });
                    try { onCommitValue && onCommitValue(variable.name, v, variable.type || 'text'); } catch (_) {}
                    try { setOpenSuggest(false); } catch (_) {}
                }
            }, val)));
        })(),
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