/**
 * 時刻変数詳細設定モーダルコンポーネント
 * 時刻変数のフォーマット設定と丸め設定を管理する独立したモーダル
 *
 * 主な機能:
 * - フォーマット設定（プリセット選択・カスタム入力）
 * - 丸め設定（有効/無効・単位・方法の選択）
 * - リアルタイムプレビュー更新
 * - 設定変更の即座反映
 *
 * @param {Object} props - コンポーネントのプロパティ
 * @param {Object} props.variable - 設定対象の時刻変数オブジェクト
 * @param {Function} props.onChange - 変数変更時のコールバック関数
 * @param {boolean} props.isOpen - モーダルの表示状態
 * @param {Function} props.onClose - モーダル閉じるときのコールバック関数
 * @returns {JSX.Element|null} 詳細設定モーダルのJSX要素（非表示時はnull）
 */
const TimeVariableSettingsModal = ({ variable, onChange, isOpen, onClose }) => {
    /**
     * フォーマット変更時の処理
     * 新しいフォーマットに応じて値を再設定し、変更を親に通知
     * @param {string} newFormat - 新しいフォーマット文字列
     */
    const handleFormatChange = React.useCallback((newValue) => {
        /**
         * セレクト変更時の分岐
         * - 'custom' が選択された場合はカスタムモードへ移行し、セレクトの値は常に 'custom' を維持
         * - プリセット選択時はプリセットモードとして format を更新
         */
        if (newValue === 'custom') {
            const nextCustom = variable.customFormat || variable.format || 'HH:mm';
            const newVariable = {
                ...variable,
                formatMode: 'custom',
                customFormat: nextCustom,
                format: nextCustom,
                value: DateUtils.formatDateTime(new Date(), nextCustom, variable.rounding)
            };
            onChange(newVariable);
            return;
        }

        const newVariable = {
            ...variable,
            formatMode: 'preset',
            format: newValue,
            value: DateUtils.formatDateTime(new Date(), newValue, variable.rounding)
        };
        onChange(newVariable);
    }, [variable, onChange]);

    /**
     * 丸め設定変更時の処理
     * 指定されたフィールドの値を更新し、時刻値を再計算
     * @param {string} field - 更新対象のフィールド名（enabled, unit, method）
     * @param {any} value - 新しい値
     */
    const handleRoundingChange = React.useCallback((field, value) => {
        const newRounding = {
            ...variable.rounding,
            [field]: value
        };
        const newVariable = {
            ...variable,
            rounding: newRounding,
            value: DateUtils.formatDateTime(new Date(), variable.format, newRounding)
        };
        onChange(newVariable);
    }, [variable, onChange]);

    // モーダルが非表示の場合は何も描画しない
    if (!isOpen) {
        return null;
    }

    /**
     * カスタムモード判定
     * - formatMode が 'custom' の場合
     * - または format がプリセット一覧に存在しない場合（後方互換: 旧データ）
     */
    const presetValues = (Constants.TIME_FORMAT_PRESETS || []).map(p => p.value);
    const isCustomMode = (variable.formatMode === 'custom') || (
        typeof variable.format === 'string' && !presetValues.includes(variable.format)
    );

    return React.createElement('div', {
        className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50",
        onClick: (e) => {
            // 背景クリックでモーダルを閉じる
            if (e.target === e.currentTarget) {
                onClose();
            }
        }
    },
        React.createElement('div', {
            className: "bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw]",
            onClick: (e) => e.stopPropagation() // モーダル内クリックで閉じないように阻止
        },
            // モーダルヘッダー
            React.createElement('div', { className: "flex justify-between items-center mb-4" },
                React.createElement('h3', { className: "text-xl font-semibold text-white" }, '詳細設定'),
                React.createElement('button', {
                    onClick: onClose,
                    className: "text-gray-400 hover:text-white transition-colors",
                    title: "閉じる"
                }, '×')
            ),

            // フォーマット設定セクション
            React.createElement('div', { className: "space-y-4" },
                React.createElement('h4', { className: "text-lg font-medium text-gray-300 border-b border-gray-600 pb-2" }, 'フォーマット設定'),

                // プリセット選択
                React.createElement('div', { className: "space-y-2" },
                    React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, 'フォーマット'),
                    React.createElement('select', {
                        value: isCustomMode ? 'custom' : (variable.format || 'HH:mm'),
                        onChange: (e) => handleFormatChange(e.target.value),
                        className: "w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    },
                        Constants.TIME_FORMAT_PRESETS.map(preset =>
                            React.createElement('option', { key: preset.value, value: preset.value }, preset.label)
                        ),
                        React.createElement('option', { value: 'custom' }, 'カスタム...')
                    )
                ),

                // カスタムフォーマット入力（カスタムが選択された場合のみ表示）
                isCustomMode && React.createElement('div', { className: "space-y-2" },
                    React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, 'カスタムフォーマット'),
                    React.createElement('input', {
                        type: "text",
                        value: variable.customFormat || '',
                        onChange: (e) => {
                            const customFormat = e.target.value;
                            const newVariable = {
                                ...variable,
                                customFormat: customFormat,
                                formatMode: 'custom',
                                format: customFormat,
                                value: DateUtils.formatDateTime(new Date(), customFormat, variable.rounding)
                            };
                            onChange(newVariable);
                        },
                        className: "w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white",
                        placeholder: "例: YYYY/MM/DD HH:mm"
                    }),
                    React.createElement('div', { className: "text-xs text-gray-400" },
                        '使用可能なトークン: YYYY(年) MM(月) DD(日) HH(時) mm(分) ss(秒)'
                    )
                )
            ),

            // 丸め設定セクション
            React.createElement('div', { className: "space-y-4 mt-6" },
                React.createElement('h4', { className: "text-lg font-medium text-gray-300 border-b border-gray-600 pb-2" }, '丸め設定'),

                // 丸め機能有効/無効チェックボックス
                React.createElement('label', { className: "flex items-center space-x-3" },
                    React.createElement('input', {
                        type: "checkbox",
                        checked: variable.rounding?.enabled || false,
                        onChange: (e) => handleRoundingChange('enabled', e.target.checked),
                        className: "w-4 h-4 rounded focus:ring-blue-500 focus:ring-2"
                    }),
                    React.createElement('span', { className: "text-white" }, '丸め機能を有効にする')
                ),

                // 丸め設定詳細（有効時のみ表示）
                variable.rounding?.enabled && React.createElement('div', { className: "space-y-4 pl-4 border-l-2 border-blue-500" },
                    // 丸め単位選択
                    React.createElement('div', { className: "space-y-2" },
                        React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, '丸める単位'),
                        React.createElement('select', {
                            value: variable.rounding?.unit || '5',
                            onChange: (e) => handleRoundingChange('unit', e.target.value),
                            className: "w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                        },
                            Constants.ROUNDING_OPTIONS.units.map(unit =>
                                React.createElement('option', { key: unit.value, value: unit.value }, unit.label)
                            )
                        )
                    ),

                    // 丸め方法選択
                    React.createElement('div', { className: "space-y-2" },
                        React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, '丸め方法'),
                        React.createElement('select', {
                            value: variable.rounding?.method || 'floor',
                            onChange: (e) => handleRoundingChange('method', e.target.value),
                            className: "w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                        },
                            Constants.ROUNDING_OPTIONS.methods.map(method =>
                                React.createElement('option', { key: method.value, value: method.value }, method.label)
                            )
                        )
                    )
                )
            ),

            // フッターボタングループ
            React.createElement('div', { className: "flex justify-end gap-3 mt-6 pt-4 border-t border-gray-600" },
                React.createElement('button', {
                    onClick: onClose,
                    className: "px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors text-white"
                }, '閉じる')
            )
        )
    );
};

/**
 * グローバルスコープへの公開
 * モジュラー構成でのコンポーネント参照を可能にする
 */
window.Components = window.Components || {};
window.Components.TimeVariableSettingsModal = TimeVariableSettingsModal;
