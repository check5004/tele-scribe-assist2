/**
 * プレビューセクションコンポーネント
 * プレビュー表示、全体コピー操作、およびテキスト編集を提供
 *
 * 主な機能:
 * - プレビュー内容の表示とテキスト編集
 * - 全体コピーのボタン操作
 *
 * パフォーマンス:
 * - プレゼンテーションに特化し、状態は親（App/usePreviewSync）から受け取る
 *
 * @param {Object} props - プロパティ
 * @param {string} props.preview - 現在のプレビューテキスト
 * @param {Object} props.previewRef - テキストエリアのref
 * @param {Function} props.onChange - テキスト変更時に呼ばれるハンドラ (text: string) => void
 * @param {Function} props.onCopyButtonClick - 全体コピー押下時に呼ばれるハンドラ () => void
 * @returns {JSX.Element} プレビューセクションのJSX
 */
/**
 * プレビューセクションコンポーネント（変数ハイライト対応）
 * テキストエリアを入力主体として維持しつつ、背後のオーバーレイで
 * `{{...}}` 形式の変数を枠と背景色で視覚的に強調表示する。
 * 入力・編集機能は従来通り阻害しない。
 */
const PreviewPane = React.memo(({ preview, previewRef, onChange, onCopyButtonClick }) => {
  const { useMemo, useCallback, useRef, useEffect } = React;
  const overlayRef = useRef(null);
  const copyButtonRef = useRef(null);

  /**
   * HTMLエスケープ
   * @param {string} s
   * @returns {string}
   */
  const escapeHtml = useCallback((s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;'), []);

  /**
   * プレビュー文字列をハイライト済みHTMLへ変換（複数行対応）
   * @param {string} text
   * @returns {string}
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

  const highlightedHtml = useMemo(() => toHighlightedHtml(preview), [preview, toHighlightedHtml]);

  /**
   * スクロール同期（textarea とオーバーレイ）
   * @returns {void}
   */
  const syncScroll = useCallback(() => {
    const ta = previewRef && previewRef.current;
    const ov = overlayRef.current;
    if (!ta || !ov) return;
    const x = ta.scrollLeft || 0;
    const y = ta.scrollTop || 0;
    ov.style.transform = `translate(${-x}px, ${-y}px)`;
  }, [previewRef]);

  useEffect(() => {
    const ta = previewRef && previewRef.current;
    if (!ta) return;
    const handler = () => syncScroll();
    ta.addEventListener('scroll', handler);
    // 初期同期
    syncScroll();
    return () => {
      try { ta.removeEventListener('scroll', handler); } catch (_) {}
    };
  }, [previewRef, syncScroll]);

  return React.createElement('div', { className: "bg-gray-800 rounded-lg shadow-xl overflow-hidden flex-none shrink-0" },
    React.createElement('div', { className: "gradient-accent p-3" },
      React.createElement('div', { className: "flex items-center justify-between gap-3 flex-wrap" },
        React.createElement('h2', { className: "text-lg font-semibold" }, 'プレビュー'),
        React.createElement('div', { className: "flex items-center gap-2" },
          React.createElement('button', {
            ref: copyButtonRef,
            onClick: onCopyButtonClick,
            className: "px-3 py-1.5 bg-green-600 rounded-md hover:bg-green-700 transition-colors",
            tabIndex: -1,
            onKeyDown: (e) => {
              if (e.key === 'Tab' && e.shiftKey) {
                // Shift+Tabでtextareaへ戻す
                e.preventDefault();
                try { previewRef && previewRef.current && previewRef.current.focus(); } catch (_) {}
              }
            }
          }, '全体コピー')
        )
      )
    ),
    React.createElement('div', { className: "p-4" },
      React.createElement('div', { className: 'relative' },
        // オーバーレイ（視覚表示: 複数行対応）
        React.createElement('div', { className: 'tsa-overlay-container', 'aria-hidden': true },
          React.createElement('div', {
            ref: overlayRef,
            className: 'tsa-overlay-content multiline w-full h-48 px-3 py-2 rounded-md scrollbar-thin',
            style: { paddingRight: '0.75rem' },
            dangerouslySetInnerHTML: { __html: highlightedHtml }
          })
        ),
        // 実際の入力（キャレット・イベント担当）
        React.createElement('textarea', {
          ref: previewRef,
          value: preview,
          onChange: (e) => onChange && onChange(e.target.value),
          className: "w-full h-48 px-3 py-2 bg-gray-700 tsa-overlay-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 scrollbar-thin resize-none",
          placeholder: "ここに報告文が表示されます...",
          onKeyDown: (e) => {
            if (e.key === 'Tab' && !e.shiftKey) {
              // 次のTabはコピーへ移動
              e.preventDefault();
              try { copyButtonRef && copyButtonRef.current && copyButtonRef.current.focus(); } catch (_) {}
            }
          }
        })
      )
    )
  );
});

PreviewPane.displayName = 'PreviewPane';

// グローバル公開
window.Components = window.Components || {};
window.Components.PreviewPane = PreviewPane;


