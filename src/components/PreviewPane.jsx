/**
 * プレビューセクションコンポーネント
 * プレビュー表示、コピー形式選択、全体コピー操作、およびテキスト編集を提供
 *
 * 主な機能:
 * - プレビュー内容の表示とテキスト編集
 * - コピー形式（plain/markdown/html）の選択とコピー実行
 * - 全体コピーのボタン操作
 *
 * パフォーマンス:
 * - プレゼンテーションに特化し、状態は親（App/usePreviewSync）から受け取る
 *
 * @param {Object} props - プロパティ
 * @param {string} props.preview - 現在のプレビューテキスト
 * @param {Object} props.previewRef - テキストエリアのref
 * @param {Function} props.onChange - テキスト変更時に呼ばれるハンドラ (text: string) => void
 * @param {Function} props.onCopyFormatChange - コピー形式選択時に呼ばれるハンドラ (format: string) => void
 * @param {Function} props.onCopyButtonClick - 全体コピー押下時に呼ばれるハンドラ () => void
 * @returns {JSX.Element} プレビューセクションのJSX
 */
const PreviewPane = React.memo(({ preview, previewRef, onChange, onCopyFormatChange, onCopyButtonClick }) => {
  return React.createElement('div', { className: "bg-gray-800 rounded-lg shadow-xl overflow-hidden" },
    React.createElement('div', { className: "gradient-accent p-3" },
      React.createElement('div', { className: "flex items-center justify-between gap-3 flex-wrap" },
        React.createElement('h2', { className: "text-lg font-semibold" }, 'プレビュー'),
        React.createElement('div', { className: "flex items-center gap-2" },
          React.createElement('select', {
            onChange: (e) => onCopyFormatChange && onCopyFormatChange(e.target.value),
            className: "px-3 py-1.5 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          },
            React.createElement('option', { value: "" }, '形式選択'),
            React.createElement('option', { value: "plain" }, 'プレーンテキスト'),
            React.createElement('option', { value: "markdown" }, 'Markdown'),
            React.createElement('option', { value: "html" }, 'HTML')
          ),
          React.createElement('button', {
            onClick: onCopyButtonClick,
            className: "px-3 py-1.5 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          }, '全体コピー')
        )
      )
    ),
    React.createElement('div', { className: "p-4" },
      React.createElement('textarea', {
        ref: previewRef,
        value: preview,
        onChange: (e) => onChange && onChange(e.target.value),
        className: "w-full h-48 px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 scrollbar-thin resize-none",
        placeholder: "ここに報告文が表示されます..."
      })
    )
  );
});

PreviewPane.displayName = 'PreviewPane';

// グローバル公開
window.Components = window.Components || {};
window.Components.PreviewPane = PreviewPane;


