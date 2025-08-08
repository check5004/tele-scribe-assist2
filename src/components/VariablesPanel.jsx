/**
 * 変数一覧パネルコンポーネント
 * 各変数の表示、未使用ハイライト、削除、編集を提供
 *
 * @param {Object} props - プロパティ
 * @param {Array} props.variables - 変数配列
 * @param {Object} props.variableUsageInfo - 使用状況情報 {unusedVariables: string[], usedVariables: string[], variableUsage: object}
 * @param {Function} props.onUpdate - 変数更新 (index:number, updatedVar:Object) => void
 * @param {Function} props.onDelete - 変数削除 (variableId:string) => void
 * @param {Function} props.onAddClick - 追加ボタン押下ハンドラ () => void
 * @returns {JSX.Element} 変数一覧パネルのJSX
 */
const VariablesPanel = React.memo(({ variables, variableUsageInfo, onUpdate, onDelete, onAddClick }) => {
  return React.createElement('div', { className: "bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col min-h-0" },
    React.createElement('div', { className: "gradient-accent p-3 flex-none" },
      React.createElement('div', { className: "flex items-center justify-between gap-3" },
        React.createElement('h2', { className: "text-lg font-semibold" }, '基本情報（変数）'),
        React.createElement('button', {
          onClick: onAddClick,
          className: "px-3 py-1.5 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2",
          title: "変数を追加"
        },
          React.createElement('svg', { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
            React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 6v6m0 0v6m0-6h6m-6 0H6" })
          ),
          '変数を追加'
        )
      )
    ),
    React.createElement('div', { className: "p-4 flex flex-col flex-1 min-h-0" },
      React.createElement('div', { className: "space-y-3 flex-1 min-h-0 overflow-y-auto scrollbar-thin px-2" },
        variables.map((variable, index) => (
          React.createElement('div', { key: variable.id, className: "space-y-2" },
            React.createElement('div', { className: "flex items-center justify-between" },
              React.createElement('label', {
                className: `text-sm font-medium ${variableUsageInfo.unusedVariables.includes(variable.id) ? 'text-yellow-400 opacity-70' : 'text-gray-100'}`,
                title: variableUsageInfo.unusedVariables.includes(variable.id) ? '未使用の変数です' : '使用中の変数です'
              },
                variable.name,
                variableUsageInfo.unusedVariables.includes(variable.id) &&
                React.createElement('span', { className: "ml-2 text-xs text-yellow-300" }, '(未使用)')
              ),
              React.createElement('button', {
                onClick: () => onDelete(variable.id),
                className: "text-red-400 hover:text-red-300",
                title: "変数を削除"
              },
                React.createElement('svg', { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                  React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })
                )
              )
            ),
            React.createElement(Components.VariableInput, {
              variable: variable,
              onChange: (updated) => onUpdate(index, updated)
            })
          )
        ))
      )
    )
  );
});

VariablesPanel.displayName = 'VariablesPanel';

// グローバル公開
window.Components = window.Components || {};
window.Components.VariablesPanel = VariablesPanel;


