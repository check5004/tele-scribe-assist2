/**
 * Undo/Redo機能フック
 * セグメントと変数の状態履歴管理と復元機能を提供
 *
 * 機能:
 * - 操作履歴のスタック管理（最大50件まで保持）
 * - 元に戻す（Undo）機能
 * - やり直し（Redo）機能
 * - 状態のスナップショット保存
 *
 * @param {Array} segments - 現在のセグメント配列
 * @param {Array} variables - 現在の変数配列
 * @param {Function} setSegments - セグメント状態更新関数
 * @param {Function} setVariables - 変数状態更新関数
 * @returns {Object} Undo/Redo関連の関数と状態を含むオブジェクト
 */
const useUndoRedo = (segments, variables, setSegments, setVariables) => {
    const { useState, useCallback } = React;

    // Undo/Redoスタックの状態管理
    const [undoStack, setUndoStack] = useState([]); // 元に戻すための履歴スタック
    const [redoStack, setRedoStack] = useState([]); // やり直すための履歴スタック

    /**
     * 現在の状態をUndoスタックに保存
     * 新しい操作が実行された時に呼び出される
     * Redoスタックはクリアされ、最大50件までの履歴を維持
     */
    const saveToUndoStack = useCallback(() => {
        setUndoStack(prev => [...prev.slice(-49), { segments: [...segments], variables: [...variables] }]);
        setRedoStack([]);
    }, [segments, variables]);

    /**
     * 元に戻す（Undo）機能
     * Undoスタックから直前の状態を取り出して復元
     * 現在の状態はRedoスタックに保存される
     */
    const undo = useCallback(() => {
        if (undoStack.length > 0) {
            const last = undoStack[undoStack.length - 1];
            setRedoStack(prev => [...prev, { segments, variables }]);
            setSegments(last.segments);
            setVariables(last.variables);
            setUndoStack(prev => prev.slice(0, -1));
        }
    }, [undoStack, segments, variables]);

    /**
     * やり直し（Redo）機能
     * RedoスタックからUndoで戻した状態を再び適用
     * 現在の状態はUndoスタックに保存される
     */
    const redo = useCallback(() => {
        if (redoStack.length > 0) {
            const last = redoStack[redoStack.length - 1];
            setUndoStack(prev => [...prev, { segments, variables }]);
            setSegments(last.segments);
            setVariables(last.variables);
            setRedoStack(prev => prev.slice(0, -1));
        }
    }, [redoStack, segments, variables]);

    return {
        undoStack,
        redoStack,
        saveToUndoStack,
        undo,
        redo
    };
};

/**
 * グローバルスコープへの公開
 * モジュラー構成でのフック参照を可能にする
 */
window.Hooks = window.Hooks || {};
window.Hooks.useUndoRedo = useUndoRedo;