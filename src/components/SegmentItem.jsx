/**
 * 文節コンポーネント（メモ化）
 * 報告書の一部を構成する個々の文節を表示・編集するコンポーネント
 *
 * 機能:
 * - ドラッグハンドルでの並び替え
 * - デバウンス付きのリアルタイム編集
 * - 文節の削除と追加
 * - パフォーマンス最適化のためのReact.memoでラップ
 *
 * @param {Object} segment - セグメントオブジェクト (id, content)
 * @param {number} index - 配列内のインデックス
 * @param {Function} onUpdate - 内容更新時のコールバック
 * @param {Function} onDelete - 削除時のコールバック
 * @param {Function} onAdd - 追加時のコールバック
 */
const SegmentItem = React.memo(({ segment, index, onUpdate, onDelete, onAdd }) => {
    const { useRef, useState, useEffect } = React;

    // ドラッグハンドルの参照
    const dragHandleRef = useRef(null);
    // ローカル編集用の状態（デバウンス処理のため）
    const [localValue, setLocalValue] = useState(segment.content);

    /**
     * ローカル値の変更を親コンポーネントに伝達（デバウンス処理）
     * 300msの遅延で更新を送信し、連続した入力での長大な更新を防止
     */
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localValue !== segment.content) {
                onUpdate(index, localValue);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [localValue]);

    /**
     * 親コンポーネントからの値の変更をローカル状態に反映
     * 他のセグメントからの影響やUndo/Redo操作に対応
     */
    useEffect(() => {
        setLocalValue(segment.content);
    }, [segment.content]);

    return React.createElement('div', { className: "flex items-center gap-2 p-2 bg-gray-800 rounded-lg group" },
        React.createElement('div', {
            ref: dragHandleRef,
            className: "cursor-move p-1 hover:bg-gray-700 rounded",
            "data-drag-handle": true
        },
            React.createElement('svg', {
                className: "w-5 h-5 text-gray-400",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24"
            },
                React.createElement('path', {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M4 6h16M4 12h16M4 18h16"
                })
            )
        ),
        React.createElement('input', {
            type: "text",
            value: localValue,
            onChange: (e) => setLocalValue(e.target.value),
            className: "flex-1 px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
            placeholder: "文節を入力..."
        }),
        React.createElement('button', {
            onClick: () => onDelete(index),
            className: "p-2 text-red-400 hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        },
            React.createElement('svg', {
                className: "w-5 h-5",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24"
            },
                React.createElement('path', {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                })
            )
        ),
        React.createElement('button', {
            onClick: () => onAdd(index),
            className: "p-2 text-green-400 hover:bg-green-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        },
            React.createElement('svg', {
                className: "w-5 h-5",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24"
            },
                React.createElement('path', {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M12 6v6m0 0v6m0-6h6m-6 0H6"
                })
            )
        )
    );
});

/**
 * グローバルスコープへの公開
 * モジュラー構成でのコンポーネント参照を可能にする
 */
window.Components = window.Components || {};
window.Components.SegmentItem = SegmentItem;