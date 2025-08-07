// データサービス - エクスポート/インポート機能
const DataService = {
    // エクスポート機能
    exportData: (variables, segments, templates, inputHistory) => {
        const data = {
            variables,
            segments,
            templates,
            inputHistory,
            exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `telescribe-assist-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // インポート機能
    importData: (event, setVariables, setSegments, setTemplates, setInputHistory) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.variables) setVariables(data.variables);
                if (data.segments) setSegments(data.segments);
                if (data.templates) setTemplates(data.templates);
                if (data.inputHistory) setInputHistory(data.inputHistory);
                alert('データのインポートが完了しました');
            } catch (error) {
                alert('データのインポートに失敗しました: ' + error.message);
            }
        };
        reader.readAsText(file);
    },

    // クリップボードコピー機能
    copyToClipboard: (preview, format = 'plain') => {
        let textToCopy = preview;

        if (format === 'markdown') {
            // Markdown形式への変換（将来の拡張用）
            textToCopy = preview;
        } else if (format === 'html') {
            textToCopy = preview.split('\n').join('<br>');
        }

        navigator.clipboard.writeText(textToCopy);
        return textToCopy;
    }
};

// グローバルに公開
window.DataService = DataService;