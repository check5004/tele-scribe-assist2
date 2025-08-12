/**
 * 変数追加モーダルコンポーネント
 * 新しい変数を作成するためのモーダルダイアログ
 *
 * 機能:
 * - 変数名の入力（曖昧検索サジェスト表示: 既存名は除外）
 * - 変数タイプの選択（テキスト/時刻/電話番号）
 * - 新しい変数の作成と状態への追加
 * - Undoスタックへの操作保存
 * - 変数名の履歴登録（T1）
 *
 * @param {Array} variables - 現在の変数配列
 * @param {Function} setVariables - 変数状態更新関数
 * @param {Function} setShowVariableModal - モーダル表示状態更新関数
 * @param {Function} saveToUndoStack - Undoスタック保存関数
 * @param {{variables:Record<string,string[]>,segments:string[],variableNames:string[],valueGroups:Array}} [inputHistory] - 入力履歴（サジェスト用）
 * @param {Function} [onRegisterVariableName] - 新規変数名の履歴登録関数 (name:string) => void
 */
const VariableModal = ({ variables, setVariables, setShowVariableModal, saveToUndoStack, inputHistory, onRegisterVariableName }) => {
    const { useState } = React;

    // モーダル内のローカル状態
    const [varName, setVarName] = useState(''); // 変数名
    const [varType, setVarType] = useState('text'); // 変数タイプ
    const [openSuggest, setOpenSuggest] = useState(false);

    // サジェスト候補（既存名を除外）
    const candidates = (() => {
        try {
            const names = Array.isArray(inputHistory?.variableNames) ? inputHistory.variableNames : [];
            const existing = new Set((variables || []).map(v => String(v.name || '')));
            const filtered = names.filter(n => !existing.has(n));
            return (window.Helpers && typeof window.Helpers.fuzzyFilterAndRank === 'function')
                ? window.Helpers.fuzzyFilterAndRank(filtered, varName)
                : filtered;
        } catch (_) {
            return [];
        }
    })();

    /**
     * 変数追加処理
     * 入力された内容に基づいて新しい変数オブジェクトを作成し、状態に追加
     */
    const handleAdd = () => {
        const newVar = {
            id: Helpers.generateId(),
            name: varName,
            type: varType,
            value: varType === 'time'
                ? DateUtils.formatDateTime(new Date(), 'HH:mm')
                : '',
            // 時刻タイプの場合はフォーマットと丸め設定を追加
            ...(varType === 'time' && {
                formatMode: 'preset',
                format: 'HH:mm',
                rounding: { enabled: false, unit: '5', method: 'floor' }
            })
        };
        setVariables([...variables, newVar]);
        try { if (typeof onRegisterVariableName === 'function') onRegisterVariableName(String(varName || '')); } catch (_) {}
        setShowVariableModal(false);
        saveToUndoStack();
    };

    return React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" },
        React.createElement('div', { className: "bg-gray-800 rounded-lg p-6 w-96" },
            React.createElement('h3', { className: "text-xl font-semibold mb-4" }, '変数を追加'),
            React.createElement('div', { className: "mb-4 relative" },
                React.createElement('label', { className: "block text-sm font-medium mb-2" }, '変数名'),
                React.createElement('input', {
                    type: "text",
                    value: varName,
                    onChange: (e) => { setVarName(e.target.value); setOpenSuggest(true); },
                    onFocus: () => setOpenSuggest(true),
                    onBlur: () => setTimeout(() => setOpenSuggest(false), 100),
                    className: "w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                    placeholder: "例: 相手先名"
                }),
                openSuggest && candidates.length > 0 && React.createElement('div', { className: "absolute left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 max-h-48 overflow-auto" },
                    candidates.slice(0, 10).map((name, i) => React.createElement('button', {
                        key: i,
                        type: 'button',
                        className: "w-full text-left px-3 py-2 text-sm hover:bg-gray-700",
                        onMouseDown: (e) => { try { e.preventDefault(); } catch (_) {} },
                        onClick: () => setVarName(name)
                    }, name))
                )
            ),
            React.createElement('div', { className: "mb-4" },
                React.createElement('label', { className: "block text-sm font-medium mb-2" }, 'タイプ'),
                React.createElement('select', {
                    value: varType,
                    onChange: (e) => setVarType(e.target.value),
                    className: "w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                },
                    React.createElement('option', { value: "text" }, 'テキスト'),
                    React.createElement('option', { value: "time" }, '時刻'),
                    React.createElement('option', { value: "phone" }, '電話番号')
                )
            ),
            React.createElement('div', { className: "flex justify-end gap-2" },
                React.createElement('button', {
                    onClick: () => setShowVariableModal(false),
                    className: "px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                }, 'キャンセル'),
                React.createElement('button', {
                    onClick: handleAdd,
                    disabled: !varName,
                    className: "px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                }, '追加')
            )
        )
    );
};

/**
 * グローバルスコープへの公開
 * モジュラー構成でのコンポーネント参照を可能にする
 */
window.Components = window.Components || {};
window.Components.VariableModal = VariableModal;