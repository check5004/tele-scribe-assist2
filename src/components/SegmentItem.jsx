/**
 * 文節コンポーネント（メモ化）
 * 報告書の一部を構成する個々の文節を表示・編集するコンポーネント
 *
 * 機能:
 * - ドラッグハンドルでの並び替え
 * - オートコンプリート機能付きのリアルタイム編集
 * - テンプレート・履歴・変数候補の表示
 * - 文節の削除と追加
 * - パフォーマンス最適化のためのReact.memoでラップ
 *
 * @param {Object} segment - セグメントオブジェクト (id, content)
 * @param {number} index - 配列内のインデックス
 * @param {Function} onUpdate - 内容更新時のコールバック
 * @param {Function} onDelete - 削除時のコールバック
 * @param {Function} onAdd - 追加時のコールバック
 * @param {Array} templates - テンプレート候補配列
 * @param {Array} inputHistory - 入力履歴候補配列
 * @param {Array} variables - 変数候補配列
 * @param {Function} [onVariableCommit] - 入力確定時（Blur時）およびテンプレ/候補適用時の変数検出コールバック
 * @param {('new'|'edited'|null)} changeStatus - 文節の変更ステータス（新規/編集/なし）
 * @param {boolean} [showDeletionAbove=false] - この文節の直前に削除差分が存在する場合に表示するか
 * @param {boolean} [showDeletionBelow=false] - この文節の直後に削除差分が存在する場合に表示するか（末尾用）
 */
const SegmentItem = React.memo(({ segment, index, onUpdate, onDelete, onAdd, templates = [], inputHistory = [], variables = [], onVariableCommit, changeStatus = null, showDeletionAbove = false, showDeletionBelow = false }) => {
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

    return React.createElement('div', { className: "w-full" },
        React.createElement('div', { className: "flex items-center gap-2 p-2 bg-gray-800 rounded-lg group" },
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
            React.createElement(Components.AutocompleteInput, {
                value: localValue,
                onChange: setLocalValue,
                templates: templates,
                inputHistory: inputHistory,
                variables: variables,
                onVariableCommit: onVariableCommit,
                placeholder: "文節を入力…（{{}}で変数）",
                className: "flex-1 px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            }),
            // 右側の固定幅カラム（変更ドットと削除ハイフンを重ねて表示）
            React.createElement('div', { className: "relative w-5 shrink-0 flex items-center justify-center" },
                changeStatus
                    ? React.createElement('span', { className: `w-2 h-2 rounded-full ${changeStatus === 'new' ? 'bg-green-400' : 'bg-yellow-400'}` })
                    : React.createElement('span', { className: "w-2 h-2 rounded-full opacity-0" }),
                showDeletionAbove && React.createElement('span', {
                    className: "absolute left-1/2 -translate-x-1/2 bottom-6 -translate-y-1/2 text-red-400 leading-none pointer-events-none select-none z-10"
                }, '−'),
                showDeletionBelow && React.createElement('span', {
                    className: "absolute left-1/2 -translate-x-1/2 top-6 translate-y-1/2 text-red-400 leading-none pointer-events-none select-none z-10"
                }, '−')
            ),
            React.createElement('button', {
                onClick: () => onDelete(index),
                title: "この文節を削除",
                className: "p-2 text-red-400 hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                tabIndex: -1
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
                title: "この下に文節を追加",
                className: "p-2 text-green-400 hover:bg-green-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                tabIndex: -1
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
        )
    );
});

/**
 * グローバルスコープへの公開
 * モジュラー構成でのコンポーネント参照を可能にする
 */
window.Components = window.Components || {};
window.Components.SegmentItem = SegmentItem;