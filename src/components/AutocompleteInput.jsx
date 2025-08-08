/**
 * オートコンプリート入力コンポーネント（変数ハイライト対応）
 * 文節編集での候補表示・選択機能を提供しつつ、`{{...}}` 形式の変数を視覚的にハイライト表示する。
 *
 * 実装方針:
 * - 入力は通常の <input type="text"> を維持し、キャレットやキーバインドは従来どおり
 * - 入力に重ねたオーバーレイレイヤーで同一テキストを描画し、`{{...}}` を枠・背景で強調
 * - 入力文字は透明化し、デザインのみ変更（操作は阻害しない）
 *
 * @param {string} value - 現在の入力値
 * @param {Function} onChange - 値変更時のコールバック
 * @param {Array} templates - テンプレート候補配列
 * @param {Array} inputHistory - 入力履歴候補配列
 * @param {Array} variables - 変数候補配列
 * @param {Function} [onVariableCommit] - 入力フィールドのBlur時およびテンプレート/候補適用時に呼ばれるコールバック。
 *  引数: (committedText: string) => void。committedTextは現在の全文字列。
 * @param {string} placeholder - プレースホルダーテキスト
 * @param {string} className - 追加CSSクラス（従来どおり入力の見た目指定に使用。オーバーレイにも適用され整列する）
 */
const AutocompleteInput = React.memo(({
    value,
    onChange,
    templates = [],
    inputHistory = [],
    variables = [],
    onVariableCommit,
    placeholder = "文節を入力...",
    className = ""
}) => {
    const { useState, useEffect, useRef, useCallback, useMemo } = React;

    // 状態管理
    const [isOpen, setIsOpen] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isVariableMode, setIsVariableMode] = useState(false);

    // DOM参照
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const overlayRef = useRef(null);
    /**
     * ドロップダウン候補クリック時に onBlur コミットを抑止するためのフラグ
     * マウスダウン→blur→クリックの順序でイベントが発火するため、mousedownでtrueにする
     */
    const suppressBlurCommitRef = useRef(false);

    /**
     * 入力（単行）の水平スクロールに合わせてオーバーレイを同期
     * input 要素は scroll イベントが限定的のため、複数イベントで都度同期
     */
    const syncInputScroll = useCallback(() => {
        const el = inputRef.current;
        const ov = overlayRef.current;
        if (!el || !ov) return;
        const x = el.scrollLeft || 0;
        ov.style.transform = `translateX(${-x}px)`;
    }, []);

    /**
     * HTMLエスケープ
     * @param {string} s - エスケープ対象文字列
     * @returns {string} エスケープ後の安全な文字列
     */
    const escapeHtml = useCallback((s) => String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;'), []);

    /**
     * 入力テキストをハイライト済みHTMLへ変換
     * `{{...}}` のトークン全体（波括弧含む）を <span class="tsa-var-token"> で囲う
     * @param {string} text - 入力文字列
     * @returns {string} 生成HTML
     */
    const toHighlightedHtml = useCallback((text) => {
        const re = /\{\{\s*([^}\s]+)\s*\}\}/g;
        const src = String(text ?? '');
        let html = '';
        let last = 0;
        let m;
        while ((m = re.exec(src)) !== null) {
            html += escapeHtml(src.slice(last, m.index));
            html += `<span class=\"tsa-var-token\">${escapeHtml(m[0])}</span>`;
            last = re.lastIndex;
        }
        html += escapeHtml(src.slice(last));
        return html;
    }, [escapeHtml]);

    /**
     * 入力値のハイライト済みHTML（メモ化）
     */
    const highlightedHtml = useMemo(() => toHighlightedHtml(value), [value, toHighlightedHtml]);

    /**
     * 候補リストの生成とフィルタリング
     * 入力値と現在のモード（通常/変数）に基づいて適切な候補を生成
     *
     * @param {string} inputValue - 現在の入力値
     * @param {boolean} variableMode - 変数候補モードかどうか
     * @returns {Array} フィルタリングされた候補配列
     */
    const generateSuggestions = useCallback((inputValue, variableMode) => {
        if (variableMode) {
            // 変数候補モード: {{ の後に変数名を候補表示
            const variablePrefix = inputValue.includes('{{') ?
                inputValue.substring(inputValue.lastIndexOf('{{') + 2) : '';

            return variables
                .filter(variable =>
                    variable.name.toLowerCase().includes(variablePrefix.toLowerCase())
                )
                .map(variable => ({
                    type: 'variable',
                    text: `{{${variable.name}}}`,
                    display: `${variable.name} (${variable.value || '未設定'})`,
                    category: '変数'
                }))
                .slice(0, 8); // 変数候補は最大8件
        } else {
            // 通常モード: テンプレートと入力履歴を候補表示
            let candidates = [];

            // テンプレート候補を追加
            templates.forEach(template => {
                candidates.push({
                    type: 'template',
                    text: template,
                    display: template,
                    category: 'テンプレート'
                });
            });

            // 入力履歴候補を追加
            inputHistory.forEach(history => {
                candidates.push({
                    type: 'history',
                    text: history,
                    display: history,
                    category: '履歴'
                });
            });

            // 入力値による前方一致フィルタリング
            if (inputValue.trim()) {
                candidates = candidates.filter(candidate =>
                    candidate.text.toLowerCase().includes(inputValue.toLowerCase())
                );
            }

            // 重複除去とソート
            const uniqueCandidates = candidates.filter((candidate, index, self) =>
                index === self.findIndex(c => c.text === candidate.text)
            );

            return uniqueCandidates.slice(0, 10); // 最大10件
        }
    }, [templates, inputHistory, variables]);

    /**
     * {{ 入力の検出と変数モードの切り替え
     * カーソル位置周辺の文字列をチェックして変数入力モードを判定
     */
    const detectVariableInput = useCallback((inputValue) => {
        const cursorPosition = inputRef.current?.selectionStart || inputValue.length;
        const beforeCursor = inputValue.substring(0, cursorPosition);

        // {{ の直後で、まだ }} で閉じられていない場合
        const lastOpenBrace = beforeCursor.lastIndexOf('{{');
        const lastCloseBrace = beforeCursor.lastIndexOf('}}');

        const inVariableMode = lastOpenBrace > lastCloseBrace && lastOpenBrace !== -1;
        setIsVariableMode(inVariableMode);

        return inVariableMode;
    }, []);

    /**
     * 候補の更新処理
     * 入力値の変化に応じて候補リストを再生成
     */
    useEffect(() => {
        const variableMode = detectVariableInput(value);
        const newSuggestions = generateSuggestions(value, variableMode);
        setSuggestions(newSuggestions);
        setSelectedIndex(-1); // 選択をリセット
    }, [value, generateSuggestions, detectVariableInput]);

    /**
     * 候補選択処理
     * 選択された候補を入力フィールドに反映
     *
     * @param {Object} suggestion - 選択された候補オブジェクト
     */
    const selectSuggestion = useCallback((suggestion) => {
        if (isVariableMode) {
            // 変数モード: {{ から現在位置までを候補で置換
            const cursorPosition = inputRef.current?.selectionStart || value.length;
            const beforeCursor = value.substring(0, cursorPosition);
            const afterCursor = value.substring(cursorPosition);

            const lastOpenBrace = beforeCursor.lastIndexOf('{{');
            const newValue = value.substring(0, lastOpenBrace) + suggestion.text + afterCursor;
            onChange(newValue);
            if (typeof onVariableCommit === 'function') {
                onVariableCommit(newValue);
            }
        } else {
            // 通常モード: 全体を候補で置換
            onChange(suggestion.text);
            if (typeof onVariableCommit === 'function' && /\{\{[^}]+\}\}/.test(suggestion.text)) {
                onVariableCommit(suggestion.text);
            }
        }

        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.focus();
        // ドロップダウン経由の操作完了後に抑止フラグを解除
        suppressBlurCommitRef.current = false;
    }, [isVariableMode, value, onChange, onVariableCommit]);

    /**
     * キーボードイベントハンドラ
     * ↑↓キーでの候補選択、Enterでの確定、Escapeでのキャンセル
     */
    const handleKeyDown = useCallback((e) => {
        if (!isOpen || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;

            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;

            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    selectSuggestion(suggestions[selectedIndex]);
                }
                break;

            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
        }
    }, [isOpen, suggestions, selectedIndex, selectSuggestion]);

    /**
     * フォーカス処理
     * フィールドにフォーカス時、候補がある場合はドロップダウンを表示
     */
    const handleFocus = useCallback(() => {
        const variableMode = detectVariableInput(value);
        const newSuggestions = generateSuggestions(value, variableMode);
        setSuggestions(newSuggestions);
        if (newSuggestions.length > 0) {
            setIsOpen(true);
        }
    }, [value, detectVariableInput, generateSuggestions]);

    /**
     * 入力値変更処理
     * デバウンス処理と候補更新を実行
     * 注意: 変数の自動作成は onBlur で行うため、ここでは `}}` 入力によるコミットは行わない
     */
    const handleInputChange = useCallback((e) => {
        const newValue = e.target.value;
        onChange(newValue);
        // 入力に伴う水平スクロール同期
        syncInputScroll();

        // 候補がある場合はドロップダウンを表示
        setTimeout(() => {
            if (suggestions.length > 0) {
                setIsOpen(true);
            }
        }, 100);
    }, [onChange, suggestions.length, syncInputScroll]);

    // 入力周辺の各種イベントでスクロール同期
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        const handler = () => syncInputScroll();
        el.addEventListener('keydown', handler);
        el.addEventListener('keyup', handler);
        el.addEventListener('click', handler);
        el.addEventListener('mouseup', handler);
        // 初期同期
        syncInputScroll();
        return () => {
            try {
                el.removeEventListener('keydown', handler);
                el.removeEventListener('keyup', handler);
                el.removeEventListener('click', handler);
                el.removeEventListener('mouseup', handler);
            } catch (_) {}
        };
    }, [syncInputScroll]);

    /**
     * フォーカスアウト処理
     * 入力確定タイミングで変数存在チェック用にコミットを一度だけ実行
     */
    const handleBlur = useCallback(() => {
        // ドロップダウン選択のためのフォーカス移動時はコミットもクローズもしない
        if (suppressBlurCommitRef.current) {
            return;
        }
        try {
            if (typeof onVariableCommit === 'function') {
                onVariableCommit(value);
            }
        } catch (_) { /* noop */ }
        setIsOpen(false);
    }, [onVariableCommit, value]);

    /**
     * 外部クリック処理
     * ドロップダウン外をクリックした場合の閉じる処理
     */
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return React.createElement('div', {
        className: `relative ${className}`,
        ref: dropdownRef
    },
        // オーバーレイ（視覚表示）
        React.createElement('div', { className: 'tsa-overlay-container z-0', 'aria-hidden': true },
            React.createElement('div', {
                ref: overlayRef,
                className: 'tsa-overlay-content px-4 py-3',
                dangerouslySetInnerHTML: { __html: highlightedHtml }
            })
        ),

        // 入力フィールド（キャレット・イベント担当）
        React.createElement('input', {
            ref: inputRef,
            type: "text",
            value: value,
            onChange: handleInputChange,
            onFocus: handleFocus,
            onBlur: handleBlur,
            onKeyDown: handleKeyDown,
            placeholder: placeholder,
            className: `w-full px-1 py-1 tsa-overlay-input bg-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isVariableMode ? 'ring-2 ring-purple-500' : ''} transition-all relative z-10`,
            autoComplete: "off"
        }),

        // 候補ドロップダウン
        isOpen && suggestions.length > 0 && React.createElement('div', {
            className: "absolute z-50 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto"
        },
            suggestions.map((suggestion, index) =>
                React.createElement('div', {
                    key: `${suggestion.type}-${index}`,
                    className: `px-3 py-2 cursor-pointer hover:bg-gray-600 ${
                        selectedIndex === index ? 'bg-blue-600' : ''
                    } border-b border-gray-600 last:border-b-0`,
                    onMouseDown: (e) => {
                        // クリック前に入力が blur して候補が閉じられるのを防ぐ
                        try { e.preventDefault(); } catch (_) {}
                        suppressBlurCommitRef.current = true;
                    },
                    onClick: () => selectSuggestion(suggestion),
                    onMouseEnter: () => setSelectedIndex(index)
                },
                    React.createElement('div', { className: "flex items-center justify-between" },
                        React.createElement('div', { className: "flex-1 truncate" },
                            React.createElement('div', { className: "text-sm" }, suggestion.display)
                        ),
                        React.createElement('div', {
                            className: `text-xs px-2 py-1 rounded ${
                                suggestion.type === 'variable' ? 'bg-purple-600' :
                                suggestion.type === 'template' ? 'bg-blue-600' :
                                'bg-gray-600'
                            }`
                        }, suggestion.category)
                    )
                )
            )
        )
    );
});

/**
 * グローバルスコープへの公開
 * モジュラー構成でのコンポーネント参照を可能にする
 */
window.Components = window.Components || {};
window.Components.AutocompleteInput = AutocompleteInput;
