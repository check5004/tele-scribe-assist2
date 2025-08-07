// Undo/Redo機能フック
const useUndoRedo = (segments, variables, setSegments, setVariables) => {
    const { useState, useCallback } = React;
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    const saveToUndoStack = useCallback(() => {
        setUndoStack(prev => [...prev.slice(-49), { segments: [...segments], variables: [...variables] }]);
        setRedoStack([]);
    }, [segments, variables]);

    const undo = useCallback(() => {
        if (undoStack.length > 0) {
            const last = undoStack[undoStack.length - 1];
            setRedoStack(prev => [...prev, { segments, variables }]);
            setSegments(last.segments);
            setVariables(last.variables);
            setUndoStack(prev => prev.slice(0, -1));
        }
    }, [undoStack, segments, variables]);

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

// グローバルに公開
window.Hooks = window.Hooks || {};
window.Hooks.useUndoRedo = useUndoRedo;