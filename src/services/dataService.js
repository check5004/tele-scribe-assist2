/**
 * データサービス - エクスポート/インポート機能
 * アプリケーションデータのバックアップ、復元、クリップボード連携機能を提供
 *
 * 機能:
 * - JSON形式でのデータエクスポート
 * - ファイルからのデータインポート
 * - 複数形式でのクリップボードコピー
 */
const DataService = {
    /**
     * データエクスポート機能
     * アプリケーションの全データをJSON形式でファイルにエクスポート
     * エクスポート日時を含むバックアップファイルを生成
     *
     * @param {Array} variables - 変数配列
     * @param {Array} segments - セグメント配列
     * @param {Object} templates - テンプレートオブジェクト
     * @param {Object} inputHistory - 入力履歴オブジェクト
     */
    exportData: (variables, segments, templates, inputHistory) => {
        const data = {
            variables,
            segments,
            templates,
            inputHistory,
            exportDate: new Date().toISOString() // エクスポート日時を記録
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // 日付付きのファイル名でダウンロード
        a.download = `telescribe-assist-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url); // メモリリーク防止
    },

    /**
     * データインポート機能
     * JSONファイルからアプリケーションデータを読み込み、状態を復元
     * ファイルフォーマットのバリデーションとエラーハンドリングを含む
     *
     * @param {Event} event - ファイル入力イベント
     * @param {Function} setVariables - 変数状態更新関数
     * @param {Function} setSegments - セグメント状態更新関数
     * @param {Function} setTemplates - テンプレート状態更新関数
     * @param {Function} setInputHistory - 入力履歴状態更新関数
     */
    importData: (event, setVariables, setSegments, setTemplates, setInputHistory) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // 各データが存在する場合のみ状態を更新
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

    /**
     * クリップボードコピー機能
     * プレビューテキストを指定した形式でクリップボードにコピー
     * 複数の出力形式に対応（プレーンテキスト、Markdown、HTML）
     *
     * @param {string} preview - コピーするテキスト内容
     * @param {string} format - 出力形式（'plain'、'markdown'、'html'）
     * @returns {string} 実際にコピーされたテキスト
     */
    copyToClipboard: (preview, format = 'plain') => {
        let textToCopy = preview;

        if (format === 'markdown') {
            // Markdown形式への変換（将来の拡張用、現在はプレーンテキストと同じ）
            textToCopy = preview;
        } else if (format === 'html') {
            // HTML形式への変換（改行を<br>タグに置換）
            textToCopy = preview.split('\n').join('<br>');
        }

        // Clipboard APIを使用してコピー
        navigator.clipboard.writeText(textToCopy);
        return textToCopy;
    }
};

/**
 * グローバルスコープへの公開
 * モジュラー構成でのサービス参照を可能にする
 */
window.DataService = DataService;