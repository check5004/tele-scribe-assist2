// 変数入力コンポーネント
const VariableInput = ({ variable, onChange }) => {
    if (variable.type === 'time') {
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
            React.createElement('div', { className: "text-xs text-gray-400" },
                'プレビュー: ', DateUtils.formatDateTime(new Date(), variable.format, variable.rounding)
            )
        );
    }

    return React.createElement('input', {
        type: "text",
        value: variable.value,
        onChange: (e) => onChange({ ...variable, value: e.target.value }),
        className: "w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
        placeholder: `${variable.name}を入力`
    });
};

// グローバルに公開
window.Components = window.Components || {};
window.Components.VariableInput = VariableInput;