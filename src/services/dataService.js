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
            exportDate: new Date().toISOString(), // エクスポート日時を記録
            exportType: 'all'
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
     * ブロックテンプレートのみエクスポート
     * テンプレートの block 部分だけをJSONとして出力
     *
     * @param {Array<{name:string,segments:string[]}>} blocks - ブロックテンプレート配列
     * @returns {void}
     */
    exportBlocks: (blocks) => {
        const data = {
            templates: { block: Array.isArray(blocks) ? blocks : [] },
            exportDate: new Date().toISOString(),
            exportType: 'blocks'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `telescribe-assist-blocks-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
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
                const { valid, exportType, errors } = DataService._validateImportedData(data);
                if (!valid) {
                    alert('インポートするJSONの形式が正しくありません:\n\n' + errors.join('\n'));
                    return;
                }
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
     * インポート（上書き or マージ選択対応）
     * 指定ファイルの内容を読み込み、モードに応じて現在データへ適用する
     *
     * @param {File|Event} fileOrEvent - 入力ファイル または input[type=file] のchangeイベント
     * @param {('overwrite'|'merge')} mode - 適用モード（完全上書き or マージ）
     * @param {Object} current - 現在のデータ { variables, segments, templates, inputHistory }
     * @param {Object} setters - セッター群 { setVariables, setSegments, setTemplates, setInputHistory }
     * @returns {void}
     */
    importDataWithMode: (fileOrEvent, mode, current, setters) => {
        const file = (() => {
            if (fileOrEvent instanceof File) return fileOrEvent;
            if (fileOrEvent && fileOrEvent.target && fileOrEvent.target.files && fileOrEvent.target.files[0]) {
                return fileOrEvent.target.files[0];
            }
            return null;
        })();
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                const { valid, exportType, errors } = DataService._validateImportedData(imported);
                if (!valid) {
                    alert('インポートするJSONの形式が正しくありません:\n\n' + errors.join('\n'));
                    return;
                }

                if (mode === 'overwrite') {
                    if (exportType === 'blocks') {
                        // ブロックのみ上書き
                        const nextTemplates = {
                            ...(current.templates || {}),
                            block: Array.isArray(imported?.templates?.block) ? imported.templates.block : []
                        };
                        setters.setTemplates(nextTemplates);
                    } else {
                        // 全体上書き（存在するキーのみ）
                        if (imported.variables) setters.setVariables(imported.variables);
                        if (imported.segments) setters.setSegments(imported.segments);
                        if (imported.templates) setters.setTemplates(imported.templates);
                        if (imported.inputHistory) setters.setInputHistory(imported.inputHistory);
                    }
                    alert('インポート（上書き）が完了しました');
                    return;
                }

                // マージ処理
                const {
                    variables: curVars = [],
                    segments: curSegs = [],
                    templates: curTpl = {},
                    inputHistory: curHist = { variables: {}, segments: [] }
                } = current || {};

                if (exportType === 'blocks') {
                    const importedBlocks = Array.isArray(imported?.templates?.block) ? imported.templates.block : [];
                    const nameToIndex = new Map((curTpl.block || []).map((b, i) => [b.name, i]));
                    const nextBlocks = [...(curTpl.block || [])];
                    for (const b of importedBlocks) {
                        if (!b || typeof b !== 'object') continue;
                        const name = String(b.name || '').trim();
                        const segs = Array.isArray(b.segments) ? b.segments.map(s => String(s ?? '')) : [];
                        if (!name) continue;
                        if (nameToIndex.has(name)) {
                            // 既存と同名 → 置換（上書き的マージ）
                            nextBlocks[nameToIndex.get(name)] = { name, segments: segs };
                        } else {
                            nextBlocks.push({ name, segments: segs });
                        }
                    }
                    setters.setTemplates({ ...curTpl, block: nextBlocks });
                    alert('ブロックのマージインポートが完了しました');
                    return;
                }

                // 全体マージ
                const importedVars = Array.isArray(imported.variables) ? imported.variables : [];
                const importedSegs = Array.isArray(imported.segments) ? imported.segments : [];
                const importedTpl = imported.templates || {};
                const importedHist = imported.inputHistory || { variables: {}, segments: [] };

                // variables: nameベースでUpsert（既存があればフィールド更新、なければ追加）
                const nameToExisting = new Map(curVars.map(v => [v.name, v]));
                const mergedVars = [...curVars];
                for (const iv of importedVars) {
                    if (!iv || typeof iv !== 'object') continue;
                    const name = iv.name;
                    if (!name) continue;
                    const existing = nameToExisting.get(name);
                    if (existing) {
                        const idx = mergedVars.findIndex(v => v.id === existing.id);
                        if (idx >= 0) {
                            mergedVars[idx] = {
                                ...existing,
                                // 値・フォーマット等は取り込み側を優先
                                value: iv.value,
                                type: iv.type || existing.type,
                                format: iv.format || existing.format,
                                rounding: iv.rounding || existing.rounding
                            };
                        }
                    } else {
                        mergedVars.push({
                            id: (window.Helpers && window.Helpers.generateId ? window.Helpers.generateId() : Math.random().toString(36).slice(2)),
                            name: iv.name,
                            type: iv.type || 'text',
                            value: iv.value || '',
                            format: iv.format,
                            rounding: iv.rounding
                        });
                    }
                }

                // segments: 取り込み分を末尾に追加（IDは再発行）
                const mergedSegs = [
                    ...curSegs,
                    ...importedSegs.map(s => ({
                        id: (window.Helpers && window.Helpers.generateId ? window.Helpers.generateId() : Math.random().toString(36).slice(2)),
                        content: String((s && s.content) ?? s ?? '')
                    }))
                ];

                // templates.segment: ユニーク和集合
                const curSegTpl = (curTpl.segment || []).map(s => String(s ?? ''));
                const impSegTpl = (importedTpl.segment || []).map(s => String(s ?? ''));
                const segTplSet = new Set([...curSegTpl, ...impSegTpl]);

                // templates.block: nameでUpsert（同名は置換）
                const curBlocks = Array.isArray(curTpl.block) ? curTpl.block : [];
                const impBlocks = Array.isArray(importedTpl.block) ? importedTpl.block : [];
                const nameToIdx = new Map(curBlocks.map((b, i) => [b.name, i]));
                const mergedBlocks = [...curBlocks];
                for (const b of impBlocks) {
                    if (!b || typeof b !== 'object') continue;
                    const name = String(b.name || '').trim();
                    const segs = Array.isArray(b.segments) ? b.segments.map(s => String(s ?? '')) : [];
                    if (!name) continue;
                    if (nameToIdx.has(name)) {
                        mergedBlocks[nameToIdx.get(name)] = { name, segments: segs };
                    } else {
                        mergedBlocks.push({ name, segments: segs });
                    }
                }

                // inputHistory: 変数ごと/セグメント履歴のユニーク和集合
                const mergedHist = { variables: {}, segments: [] };
                const curHistVars = curHist.variables || {};
                const impHistVars = importedHist.variables || {};
                const varNames = new Set([...Object.keys(curHistVars), ...Object.keys(impHistVars)]);
                for (const vn of varNames) {
                    const list = [
                        ...new Set([...
                            (Array.isArray(curHistVars[vn]) ? curHistVars[vn] : []).map(String),
                            ... (Array.isArray(impHistVars[vn]) ? impHistVars[vn] : []).map(String)
                        ])
                    ];
                    mergedHist.variables[vn] = list;
                }
                mergedHist.segments = [
                    ...new Set([
                        ... (Array.isArray(curHist.segments) ? curHist.segments : []).map(String),
                        ... (Array.isArray(importedHist.segments) ? importedHist.segments : []).map(String)
                    ])
                ];

                // セット
                setters.setVariables(mergedVars);
                setters.setSegments(mergedSegs);
                setters.setTemplates({
                    segment: Array.from(segTplSet),
                    block: mergedBlocks
                });
                setters.setInputHistory(mergedHist);

                alert('インポート（マージ）が完了しました');
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
 * インポートJSONの形式バリデーション
 * - 'all'（全体）/ 'blocks'（ブロックのみ）の両方を判定・検証
 *
 * @param {any} data - 解析済みJSONオブジェクト
 * @returns {{valid:boolean, exportType:'all'|'blocks', errors:string[]}}
 */
DataService._validateImportedData = (data) => {
    const errors = [];
    const fail = (msg) => { errors.push(msg); };

    if (typeof data !== 'object' || data === null) {
        return { valid: false, exportType: 'all', errors: ['JSONのルートがオブジェクトではありません'] };
    }

    // exportType推定
    const looksBlocksOnly = data && data.templates && Array.isArray(data.templates.block) && !('variables' in data) && !('segments' in data) && !('inputHistory' in data);
    const exportType = data.exportType === 'blocks' || looksBlocksOnly ? 'blocks' : 'all';

    // 共通: templates があれば基本妥当性チェック
    const validateTemplates = (tpl) => {
        if (typeof tpl !== 'object' || tpl === null) {
            fail('templates はオブジェクトである必要があります');
            return;
        }
        if ('segment' in tpl) {
            if (!Array.isArray(tpl.segment) || !tpl.segment.every(s => typeof s === 'string')) {
                fail('templates.segment は文字列配列である必要があります');
            }
        }
        if ('block' in tpl) {
            if (!Array.isArray(tpl.block)) {
                fail('templates.block は配列である必要があります');
            } else {
                tpl.block.forEach((b, i) => {
                    if (typeof b !== 'object' || b === null) {
                        fail(`templates.block[${i}] はオブジェクトである必要があります`);
                        return;
                    }
                    if (typeof b.name !== 'string' || b.name.trim() === '') {
                        fail(`templates.block[${i}].name は非空の文字列である必要があります`);
                    }
                    if (!Array.isArray(b.segments) || !b.segments.every(s => typeof s === 'string')) {
                        fail(`templates.block[${i}].segments は文字列配列である必要があります`);
                    }
                });
            }
        }
    };

    if (exportType === 'blocks') {
        // ブロックのみ
        if (!data.templates || !Array.isArray(data.templates.block)) {
            fail('ブロックエクスポートのJSONには templates.block 配列が必要です');
        } else {
            validateTemplates(data.templates);
        }
    } else {
        // 全体: 任意のキーが存在すればその形を検証（すべて任意。少なくとも1つは推奨）
        const hasAnyKey = ('variables' in data) || ('segments' in data) || ('templates' in data) || ('inputHistory' in data);
        if (!hasAnyKey) {
            fail('全体エクスポートのJSONには少なくとも1つのキー（variables/segments/templates/inputHistory）が必要です');
        }

        if ('variables' in data) {
            if (!Array.isArray(data.variables)) {
                fail('variables は配列である必要があります');
            } else {
                data.variables.forEach((v, i) => {
                    if (typeof v !== 'object' || v === null) {
                        fail(`variables[${i}] はオブジェクトである必要があります`);
                        return;
                    }
                    if (typeof v.name !== 'string' || v.name.trim() === '') {
                        fail(`variables[${i}].name は非空の文字列である必要があります`);
                    }
                    // type/value/format/rounding は任意だが、type は文字列ならOK
                    if ('type' in v && typeof v.type !== 'string') {
                        fail(`variables[${i}].type は文字列である必要があります`);
                    }
                });
            }
        }

        if ('segments' in data) {
            if (!Array.isArray(data.segments)) {
                fail('segments は配列である必要があります');
            } else {
                data.segments.forEach((s, i) => {
                    if (typeof s === 'object' && s !== null) {
                        if (!('content' in s)) {
                            fail(`segments[${i}] に content フィールドが必要です（文字列）`);
                        } else if (typeof s.content !== 'string') {
                            fail(`segments[${i}].content は文字列である必要があります`);
                        }
                    } else if (typeof s !== 'string') {
                        fail(`segments[${i}] は文字列または {content:string} 形式である必要があります`);
                    }
                });
            }
        }

        if ('templates' in data) {
            validateTemplates(data.templates);
        }

        if ('inputHistory' in data) {
            const h = data.inputHistory;
            if (typeof h !== 'object' || h === null) {
                fail('inputHistory はオブジェクトである必要があります');
            } else {
                if ('variables' in h) {
                    if (typeof h.variables !== 'object' || h.variables === null) {
                        fail('inputHistory.variables はオブジェクトである必要があります');
                    } else {
                        Object.keys(h.variables).forEach((key) => {
                            const arr = h.variables[key];
                            if (!Array.isArray(arr) || !arr.every(s => typeof s === 'string')) {
                                fail(`inputHistory.variables['${key}'] は文字列配列である必要があります`);
                            }
                        });
                    }
                }
                if ('segments' in h) {
                    if (!Array.isArray(h.segments) || !h.segments.every(s => typeof s === 'string')) {
                        fail('inputHistory.segments は文字列配列である必要があります');
                    }
                }
            }
        }
    }

    return { valid: errors.length === 0, exportType, errors };
};

/**
 * グローバルスコープへの公開
 * モジュラー構成でのサービス参照を可能にする
 */
window.DataService = DataService;