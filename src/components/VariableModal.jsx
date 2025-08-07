// 変数追加モーダルコンポーネント
const VariableModal = ({ variables, setVariables, setShowVariableModal, saveToUndoStack }) => {
    const { useState } = React;
    const [varName, setVarName] = useState('');
    const [varType, setVarType] = useState('text');

    const handleAdd = () => {
        const newVar = {
            id: Helpers.generateId(),
            name: varName,
            type: varType,
            value: varType === 'time' ? DateUtils.formatDateTime(new Date(), 'HH:mm') : '',
            ...(varType === 'time' && {
                format: 'HH:mm',
                rounding: { enabled: false, unit: '5', method: 'floor' }
            })
        };
        setVariables([...variables, newVar]);
        setShowVariableModal(false);
        saveToUndoStack();
    };

    return React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" },
        React.createElement('div', { className: "bg-gray-800 rounded-lg p-6 w-96" },
            React.createElement('h3', { className: "text-xl font-semibold mb-4" }, '変数を追加'),
            React.createElement('div', { className: "mb-4" },
                React.createElement('label', { className: "block text-sm font-medium mb-2" }, '変数名'),
                React.createElement('input', {
                    type: "text",
                    value: varName,
                    onChange: (e) => setVarName(e.target.value),
                    className: "w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                    placeholder: "例: 相手先名"
                })
            ),
            React.createElement('div', { className: "mb-4" },
                React.createElement('label', { className: "block text-sm font-medium mb-2" }, 'タイプ'),
                React.createElement('select', {
                    value: varType,
                    onChange: (e) => setVarType(e.target.value),
                    className: "w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                },
                    React.createElement('option', { value: "text" }, 'テキスト'),
                    React.createElement('option', { value: "time" }, '時刻')
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

// グローバルに公開
window.Components = window.Components || {};
window.Components.VariableModal = VariableModal;