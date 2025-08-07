// ドラッグ&ドロップ機能フック
const useDragDrop = (segments, setSegments, saveToUndoStack) => {
    const { useEffect } = React;

    useEffect(() => {
        const container = document.getElementById('segments-container');
        if (container && window.Sortable) {
            const sortable = window.Sortable.create(container, {
                animation: 150,
                handle: '[data-drag-handle]',
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                onEnd: (evt) => {
                    const newSegments = [...segments];
                    const [movedItem] = newSegments.splice(evt.oldIndex, 1);
                    newSegments.splice(evt.newIndex, 0, movedItem);
                    setSegments(newSegments);
                    saveToUndoStack();
                }
            });
            return () => sortable.destroy();
        }
    }, [segments]);
};

// グローバルに公開
window.Hooks = window.Hooks || {};
window.Hooks.useDragDrop = useDragDrop;