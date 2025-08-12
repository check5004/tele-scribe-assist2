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
 * @param {Function} props.onOpenDataManagement - データ管理モーダルを開く () => void
 * @returns {JSX.Element} サイドバーJSX
 */
const SessionSidebar = React.memo(({ open, sessionHistory, onToggle, onNew, onLoad, onOpenTemplateManager, onOpenDataManagement }) => {
  /**
   * 履歴一覧用の表示テキストを生成
   * - 改行とスペース（全角/半角）を除去して詰めた1行を返す
   * - 可能な限り長く表示し、CSSの `truncate` で末尾省略
   *
   * @param {string} content - セッション内容の全文
   * @returns {string} 整形済み1行表示テキスト
   */
  const formatSessionListText = (content) => {
    try {
      const raw = String(content ?? '');
      // 改行・タブ除去、スペース（半角/全角）除去
      return raw.replace(/[\r\n\t]/g, '').replace(/[ \u3000]+/g, '')
        || '(空の報告)';
    } catch (_) {
      return '(空の報告)';
    }
  };

  /**
   * ホバー時のツールチップ用タイトル文字列を生成
   * - 改行や空白はそのまま保持し、全文を `title` 属性に表示
   *
   * @param {string} content - セッション内容の全文
   * @returns {string} ツールチップ表示用の文字列
   */
  const buildSessionTitle = (content) => {
    try {
      const raw = String(content ?? '');
      return raw.length > 0 ? raw : '(空の報告)';
    } catch (_) {
      return '(空の報告)';
    }
  };
  return React.createElement('aside', {
    id: 'session-sidebar',
    className: `${open ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 overflow-hidden transition-all duration-300 lg:relative lg:translate-x-0 ${open ? 'lg:w-64' : 'lg:w-0'}`,
    role: 'complementary',
    'aria-label': 'セッション履歴サイドバー'
  },
    React.createElement('div', { className: "w-64 min-w-[16rem] max-w-[16rem] h-full flex flex-col" },
      React.createElement('div', { className: "p-4" },
      // 位置入れ替え: 先に「新規作成」ボタン、その後にラベル
      React.createElement('button', {
        onClick: onNew,
        className: "w-full px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors mb-4"
      }, '新規作成'),
      React.createElement('h2', { className: "text-lg font-semibold mb-4" }, 'セッション履歴'),
      React.createElement('div', { className: "space-y-2 max-h-96 overflow-y-auto scrollbar-thin" },
        sessionHistory.map((session) => (
          React.createElement('button', {
            key: session.id,
            onClick: () => onLoad(session),
            className: "w-full text-left p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors",
            title: buildSessionTitle(session.content)
          },
            React.createElement('div', { className: "text-sm truncate" },
              formatSessionListText(session.content)
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
      ),
      React.createElement('hr', { className: "my-4 border-gray-700" }),
      React.createElement('div', { className: "space-y-2" },
        React.createElement('h3', { className: "text-sm font-semibold text-gray-300" }, 'データ管理'),
        React.createElement('button', {
          onClick: onOpenDataManagement,
          className: "w-full px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
        }, 'インポート/エクスポート')
      ),
      React.createElement('div', { className: 'lg:hidden mt-6' },
        React.createElement('button', {
          onClick: onToggle,
          className: 'w-full px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors'
        }, '閉じる')
      ))
    )
  );
});

SessionSidebar.displayName = 'SessionSidebar';

// グローバル公開
window.Components = window.Components || {};
window.Components.SessionSidebar = SessionSidebar;


