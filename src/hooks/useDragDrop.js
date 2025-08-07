/**
 * ドラッグ&ドロップ機能フック
 * SortableJSを使用してセグメントの並び替え機能を提供
 *
 * 機能:
 * - セグメントのドラッグ&ドロップによる順序変更
 * - アニメーション付きのスムーズな移動
 * - ドラッグハンドルでの操作制限
 * - Undo/Redo操作の自動保存
 *
 * @param {Array} segments - セグメント配列
 * @param {Function} setSegments - セグメント状態更新関数
 * @param {Function} saveToUndoStack - Undoスタック保存関数
 */
const useDragDrop = (segments, setSegments, saveToUndoStack) => {
    const { useEffect } = React;

    /**
     * SortableJSの初期化とイベントハンドラ設定
     * セグメントが変更されるたびに再初期化
     */
    useEffect(() => {
        const container = document.getElementById('segments-container');
        if (container && window.Sortable) {
            const sortable = window.Sortable.create(container, {
                animation: 150, // アニメーション長さ（ミリ秒）
                handle: '[data-drag-handle]', // ドラッグハンドルのセレクタ
                ghostClass: 'sortable-ghost', // ドラッグ中のCSSクラス
                dragClass: 'sortable-drag', // ドラッグ要素のCSSクラス
                /**
                 * ドラッグ終了時の処理
                 * 配列の並び替えと状態更新を実行
                 */
                onEnd: (evt) => {
                    const newSegments = [...segments];
                    const [movedItem] = newSegments.splice(evt.oldIndex, 1);
                    newSegments.splice(evt.newIndex, 0, movedItem);
                    setSegments(newSegments);
                    saveToUndoStack();
                }
            });
            // コンポーネントアンマウント時のSortableインスタンス破棄
            return () => sortable.destroy();
        }
    }, [segments]);
};

/**
 * グローバルスコープへの公開
 * モジュラー構成でのフック参照を可能にする
 */
window.Hooks = window.Hooks || {};
window.Hooks.useDragDrop = useDragDrop;