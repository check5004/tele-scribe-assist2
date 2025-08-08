/**
 * セッションサイドバーコンポーネント
 * セッション履歴の表示とロード、新規作成ボタンを提供
 *
 * @param {Object} props - プロパティ
 * @param {boolean} props.open - サイドバー開閉状態
 * @param {Array} props.sessionHistory - セッション履歴
 * @param {Function} props.onToggle - 開閉トグル () => void
 * @param {Function} props.onNew - 新規作成押下 () => void
 * @param {Function} props.onLoad - セッションロード (session:Object) => void
 * @param {Function} props.onOpenTemplateManager - テンプレート管理開く () => void
 * @returns {JSX.Element} サイドバーJSX
 */
const SessionSidebar = React.memo(({ open, sessionHistory, onToggle, onNew, onLoad, onOpenTemplateManager }) => {
  return React.createElement('div', { className: `${open ? 'w-64' : 'w-0'} transition-all duration-300 bg-gray-800 overflow-hidden` },
    React.createElement('div', { className: "p-4" },
      React.createElement('h2', { className: "text-lg font-semibold mb-4" }, 'セッション履歴'),
      React.createElement('button', {
        onClick: onNew,
        className: "w-full px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors mb-4"
      }, '新規作成'),
      React.createElement('div', { className: "space-y-2 max-h-96 overflow-y-auto scrollbar-thin" },
        sessionHistory.map((session) => (
          React.createElement('button', {
            key: session.id,
            onClick: () => onLoad(session),
            className: "w-full text-left p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
          },
            React.createElement('div', { className: "text-sm truncate" },
              session.content.split('\n')[0] || '(空の報告)'
            ),
            React.createElement('div', { className: "text-xs text-gray-400" },
              new Date(session.timestamp).toLocaleString('ja-JP')
            )
          )
        ))
      ),
      React.createElement('hr', { className: "my-4 border-gray-700" }),
      React.createElement('div', { className: "space-y-2" },
        React.createElement('h3', { className: "text-sm font-semibold text-gray-300" }, 'テンプレート'),
        React.createElement('button', {
          onClick: onOpenTemplateManager,
          className: "w-full px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
        }, 'テンプレート管理')
      )
    )
  );
});

SessionSidebar.displayName = 'SessionSidebar';

// グローバル公開
window.Components = window.Components || {};
window.Components.SessionSidebar = SessionSidebar;


