/**
 * セッションサイドバーコンポーネント
 * セッション履歴の表示・お気に入り管理とロード、新規作成ボタンを提供
 *
 * 主な機能:
 * - 履歴/お気に入りのタブ切り替え表示
 * - 各履歴アイテム右端の星アイコンでお気に入りON/OFF
 * - 履歴アイテムのクリックでセッションをロード
 * - 新規作成、テンプレート管理、データ管理のショートカット
 *
 * @param {Object} props - プロパティ
 * @param {boolean} props.open - サイドバー開閉状態
 * @param {Array<{id:string,timestamp:string,content:string,variables:Array,segments:Array,favorite?:boolean}>} props.sessionHistory - セッション履歴
 * @param {Function} props.onToggle - 開閉トグル () => void
 * @param {Function} props.onNew - 新規作成押下 () => void
 * @param {Function} props.onLoad - セッションロード (session:Object) => void
 * @param {Function} props.onToggleFavorite - お気に入りトグル (sessionId:string, next?:boolean) => void
 * @param {Function} props.onOpenTemplateManager - テンプレート管理開く () => void
 * @param {Function} props.onOpenDataManagement - データ管理モーダルを開く () => void
 * @returns {JSX.Element} サイドバーJSX
 */
const SessionSidebar = React.memo(({ open, sessionHistory, onToggle, onNew, onLoad, onToggleFavorite, onOpenTemplateManager, onOpenDataManagement }) => {
  const { useState, useMemo, useCallback } = React;
  /**
   * 表示タブの状態
   * - 'history': すべての履歴
   * - 'favorites': お気に入りのみ
   * @type {[('history'|'favorites'), Function]}
   */
  const [activeTab, setActiveTab] = useState('history');
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

  /**
   * タブ別の表示対象セッション配列を算出
   * お気に入りタブでは favorite === true のみ抽出
   * @returns {Array}
   */
  const displayedSessions = useMemo(() => {
    if (activeTab === 'favorites') {
      return (sessionHistory || []).filter(s => !!s?.favorite);
    }
    return sessionHistory || [];
  }, [activeTab, sessionHistory]);

  /**
   * お気に入り切り替えボタンの押下ハンドラ
   * 親から渡された onToggleFavorite を呼び出す
   * @param {MouseEvent} e - クリックイベント（バブリング抑止に使用）
   * @param {string} sessionId - 対象セッションID
   * @param {boolean} next - 次の状態
   * @returns {void}
   */
  const handleToggleFavorite = useCallback((e, sessionId, next) => {
    try { e?.stopPropagation?.(); } catch (_) {}
    if (typeof onToggleFavorite === 'function') {
      onToggleFavorite(sessionId, next);
    }
  }, [onToggleFavorite]);
  return React.createElement('aside', {
    id: 'session-sidebar',
    className: `${open ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 overflow-hidden transition-all duration-300 lg:relative lg:translate-x-0 ${open ? 'lg:w-64' : 'lg:w-0'}`,
    role: 'complementary',
    'aria-label': 'セッション履歴サイドバー'
  },
    React.createElement('div', { className: "w-64 min-w-[16rem] max-w-[16rem] h-full flex flex-col min-h-0" },
      React.createElement('div', { className: "p-4 h-full flex flex-col min-h-0" },
      // 位置入れ替え: 先に「新規作成」ボタン、その後にラベル
      React.createElement('button', {
        onClick: onNew,
        className: "w-full px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors mb-4"
      }, '新規作成'),
      // タブ（等幅2分割）
      React.createElement('div', { className: "grid grid-cols-2 mb-3 border-b border-gray-700", role: 'tablist', 'aria-label': '履歴とお気に入りの切り替え' },
        React.createElement('button', {
          role: 'tab',
          'aria-selected': activeTab === 'history' ? 'true' : 'false',
          onClick: () => setActiveTab('history'),
          className: `-mb-px w-full text-center px-3 py-2 text-sm ${activeTab === 'history' ? 'border-b-2 border-blue-400 text-white font-semibold' : 'border-b-2 border-transparent text-gray-300 hover:text-gray-100'}`
        }, '履歴'),
        React.createElement('button', {
          role: 'tab',
          'aria-selected': activeTab === 'favorites' ? 'true' : 'false',
          onClick: () => setActiveTab('favorites'),
          className: `-mb-px w-full text-center px-3 py-2 text-sm ${activeTab === 'favorites' ? 'border-b-2 border-blue-400 text-white font-semibold' : 'border-b-2 border-transparent text-gray-300 hover:text-gray-100'}`
        }, 'お気に入り')
      ),
      // リスト（右側スクロールバーの干渉を回避するため右パディング付与＋スクロールバーガターを安定化）
      React.createElement('div', { className: "flex-1 min-h-0 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-thin pr-1", style: { scrollbarGutter: 'stable' } },
        displayedSessions.map((session) => (
          React.createElement('div', {
            key: session.id,
            className: "w-full p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors",
            title: buildSessionTitle(session.content)
          },
            React.createElement('div', { className: "flex items-center gap-2 min-w-0" },
              // 左: ロードボタン（本文）
              React.createElement('button', {
                onClick: () => onLoad(session),
                className: "min-w-0 flex-1 text-left"
              },
                React.createElement('div', { className: "text-sm truncate" },
                  formatSessionListText(session.content)
                ),
                React.createElement('div', { className: "text-xs text-gray-400" },
                  new Date(session.timestamp).toLocaleString('ja-JP')
                )
              ),
              // 右: お気に入りトグル
              React.createElement('button', {
                onClick: (e) => handleToggleFavorite(e, session.id, !session.favorite),
                className: `px-2 py-1 rounded hover:bg-gray-500`,
                title: session.favorite ? 'お気に入りから外す' : 'お気に入りに追加',
                'aria-label': session.favorite ? 'お気に入りから外す' : 'お気に入りに追加',
                'aria-pressed': session.favorite ? 'true' : 'false'
              }, session.favorite ?
                React.createElement('span', { className: 'text-yellow-400 text-base' }, '★') :
                React.createElement('span', { className: 'text-gray-300 text-base' }, '☆')
              )
            )
          )
        )),
        // 空表示
        (displayedSessions.length === 0) && React.createElement('div', { className: "text-sm text-gray-400 p-2" }, activeTab === 'favorites' ? 'お気に入りはまだありません' : '履歴がありません')
      ),
      // 下寄せアクション（テンプレート・データ管理・閉じる）
      React.createElement('div', { className: "mt-auto" },
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
        )
      ))
    )
  );
});

SessionSidebar.displayName = 'SessionSidebar';

// グローバル公開
window.Components = window.Components || {};
window.Components.SessionSidebar = SessionSidebar;


