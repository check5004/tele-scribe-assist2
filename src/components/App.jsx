/**
 * メインアプリケーションコンポーネント
 * TeleScribe Assistのルートコンポーネントとして全体の状態管理と画面描画を担当
 *
 * 主な機能:
 * - 変数とセグメントの状態管理
 * - リアルタイムプレビューの生成
 * - セッション履歴の管理
 * - ドラッグ&ドロップによるセグメント順序変更
 * - Undo/Redo機能
 * - データのインポート/エクスポート
 * - クリップボードコピー機能
 */
function App() {
    const { useState, useEffect, useCallback, useRef, useMemo } = React;

    /**
     * 初期データの取得
     * LocalStorageから保存されたデータを読み込み
     */
    const { loadData, saveData } = Hooks.useLocalStorage();
    const initialData = loadData();

    /**
     * State管理
     * アプリケーション全体の状態を定義
     */
    const [variables, setVariables] = useState(
        initialData?.variables || Constants.createSampleVariables()
    );
    const [segments, setSegments] = useState(
        initialData?.segments || Constants.createSampleSegments()
    );
    // プレビューは usePreviewSync フックで管理するためローカルstateは削除
    const [sessionHistory, setSessionHistory] = useState(initialData?.sessionHistory || []);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showVariableModal, setShowVariableModal] = useState(false);
    const [showTemplateManager, setShowTemplateManager] = useState(false);
    const [showDataManagement, setShowDataManagement] = useState(false);
    const [showSaveBlockModal, setShowSaveBlockModal] = useState(false);
    const [selectedBlockIndex, setSelectedBlockIndex] = useState(-1);
    const [templates, setTemplates] = useState(
        initialData?.templates || Constants.SAMPLE_TEMPLATES
    );
    const [inputHistory, setInputHistory] = useState(
        initialData?.inputHistory || Constants.INITIAL_INPUT_HISTORY
    );
    const [variableUsageInfo, setVariableUsageInfo] = useState({
        unusedVariables: [],
        usedVariables: [],
        variableUsage: {}
    });
    const [unifiedSegments, setUnifiedSegments] = useState([]);
    const [segmentChangeStatus, setSegmentChangeStatus] = useState([]); // 'new' | 'edited' | null
    const [baselineBlockIndex, setBaselineBlockIndex] = useState(-1); // 比較対象のブロックインデックス
    const [deletionMarkers, setDeletionMarkers] = useState([]); // セグメント間の削除インジケーター位置（0..segments.length）

    // Undo/Redo機能の初期化（早期に利用可能にする）
    const { undoStack, redoStack, saveToUndoStack, undo, redo } = Hooks.useUndoRedo(
        segments, variables, setSegments, setVariables
    );

    // プレビュー同期フックの初期化（デバウンス300ms、カーソル保持を内包）
    const { preview, previewRef, handlePreviewChange } = Hooks.usePreviewSync({
        variables,
        segments,
        setVariables,
        setSegments,
        saveToUndoStack
    });

    /**
     * トースト通知の状態
     * 一時的な通知メッセージの表示制御を担当
     */
    const [toastState, setToastState] = useState({ visible: false, message: '' });
    const toastTimerRef = useRef(null);

    /**
     * トースト表示関数
     * 指定したメッセージを一定時間だけ画面右下に表示する
     *
     * @param {string} message - 表示するメッセージ
     * @param {number} [durationMs=1800] - 表示継続時間（ミリ秒）
     * @returns {void}
     */
    const showToast = useCallback((message, durationMs = 1800) => {
        try {
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
                toastTimerRef.current = null;
            }
        } catch (_) {}
        setToastState({ visible: true, message });
        toastTimerRef.current = setTimeout(() => {
            setToastState({ visible: false, message: '' });
            toastTimerRef.current = null;
        }, durationMs);
    }, []);

    // 類似性判定は utils/diffUtils.js の DiffUtils.linesAreSimilar を使用

    /**
     * 類似性ベースのLCS整列（Git風）
     * - 類似行はマッチ（編集扱い）
     * - 類似しない基準行は削除（赤ハイフン）
     * - 類似しない現在行は追加（new）
     * @param {string[]} baselineLines
     * @param {string[]} currentLines
     * @returns {{pairs: Array<[number, number]>, deletions: number[]}}
     */
    // 整列は utils/diffUtils.js の DiffUtils.computeDiffAlignment を使用

    // プレビュー編集制御は usePreviewSync に移譲

    // カスタムフックの初期化（Drag&Drop）

    // ドラッグ&ドロップの初期化
    Hooks.useDragDrop(segments, setSegments, saveToUndoStack);

    /**
     * 文節変更ステータスの再計算
     * 選択中のブロック（baseline）と現在のsegmentsを常に比較して
     * 'new'|'edited'|null を割り当てる
     */
    useEffect(() => {
        const baseIdx = baselineBlockIndex >= 0 ? baselineBlockIndex : selectedBlockIndex;
        const baseline = (templates.block || [])[baseIdx]?.segments || [];
        const current = segments.map(s => String(s.content ?? ''));
        const { pairs, deletions } = DiffUtils.computeDiffAlignment(baseline.map(s => String(s ?? '')), current);
        const currentIndexToBaselineIndex = new Map();
        for (const [bi, cj] of pairs) currentIndexToBaselineIndex.set(cj, bi);
        const nextStatus = current.map((content, j) => {
            if (!currentIndexToBaselineIndex.has(j)) {
                return 'new';
            }
            const bi = currentIndexToBaselineIndex.get(j);
            const baseContent = String(baseline[bi] ?? '');
            return content === baseContent ? null : 'edited';
        });
        setSegmentChangeStatus(nextStatus);
        setDeletionMarkers(deletions);
    }, [segments, templates, selectedBlockIndex, baselineBlockIndex]);

    // グローバル未保存変更判定（テンプレ管理からの確認用）
    useEffect(() => {
        window.__telescribe_hasUnsavedChanges = () =>
            segmentChangeStatus.some(s => s === 'new' || s === 'edited') ||
            (deletionMarkers && deletionMarkers.length > 0);
        return () => { try { delete window.__telescribe_hasUnsavedChanges; } catch (_) {} };
    }, [segmentChangeStatus, deletionMarkers]);

    /**
     * LocalStorageへの自動保存
     * 状態が変更されるたびに自動的にデータを保存
     */
    useEffect(() => {
        saveData(variables, segments, sessionHistory, templates, inputHistory);
    }, [variables, segments, sessionHistory, templates, inputHistory]);

    // プレビュー再生成は usePreviewSync に移譲

    /**
     * 変数使用状況の自動更新
     * セグメントまたは変数が変更されるたびに使用状況を分析し、
     * 未使用変数のハイライト表示に使用する情報を更新
     */
    useEffect(() => {
        const usageInfo = Helpers.analyzeVariableUsage(variables, segments);
        setVariableUsageInfo(usageInfo);
    }, [segments, variables]);

    /**
     * セグメント操作関数群
     */

    /**
     * セグメントの内容を更新
     * @param {number} index - 更新するセグメントのインデックス
     * @param {string} content - 新しい内容
     */
    const updateSegment = useCallback((index, content) => {
        setSegments(prev => {
            const newSegments = [...prev];
            newSegments[index].content = content;
            return newSegments;
        });
    }, []);

    /**
     * セグメントを削除
     * @param {number} index - 削除するセグメントのインデックス
     */
    const deleteSegment = useCallback((index) => {
        setSegments(prev => {
            if (prev.length > 1) {
                saveToUndoStack();
                return prev.filter((_, i) => i !== index);
            }
            return prev;
        });
    }, [saveToUndoStack]);

    /**
     * 指定位置に新しいセグメントを追加
     * @param {number} index - 追加位置のインデックス
     */
    const addSegment = useCallback((index) => {
        setSegments(prev => {
            const newSegments = [...prev];
            newSegments.splice(index + 1, 0, { id: Helpers.generateId(), content: '' });
            saveToUndoStack();
            return newSegments;
        });
    }, [saveToUndoStack]);

    // カーソル保存/復元は usePreviewSync に移譲

    /**
     * デバウンス処理されたプレビュー同期関数
     * 連続入力時の過剰な状態更新を防ぎ、編集完了後に同期を実行
     */
    // デバウンス同期は usePreviewSync に移譲

    /**
     * クリップボードコピー機能
     * プレビュー内容を指定した形式でクリップボードにコピーし、
     * 同時に現在の状態をセッション履歴に保存
     * @param {string} format - コピー形式（plain、markdown、html）
     */
    const copyToClipboard = (format = 'plain') => {
        DataService.copyToClipboard(preview, format);

        // セッション履歴に追加（最大50件まで保持）
        const newSession = {
            id: Helpers.generateId(),
            timestamp: new Date().toISOString(),
            content: preview,
            variables: [...variables],
            segments: [...segments]
        };
        setSessionHistory([newSession, ...sessionHistory].slice(0, 50));
    };

    /**
     * プレビューの全体コピー（ボタン押下用）
     * プレーンテキストでコピーし、完了トーストを表示
     *
     * 注意: 形式セレクトの変更時コピーではトーストを表示しない
     * （明示的なボタン操作に限定して通知）
     *
     * @returns {void}
     */
    const handleCopyButtonClick = useCallback(() => {
        copyToClipboard('plain');
        showToast('コピーしました');
    }, [copyToClipboard, showToast]);

    return React.createElement('div', { className: "h-screen overflow-hidden bg-gray-900 text-gray-100 flex flex-col" },
        // ヘッダー
        React.createElement('header', { className: "gradient-title px-6 py-4 shadow-lg" },
            React.createElement('div', { className: "flex items-center justify-between" },
                React.createElement('div', { className: "flex items-center gap-4" },
                    React.createElement('button', {
                        onClick: () => setSidebarOpen(!sidebarOpen),
                        className: "p-2 hover:bg-white/10 rounded-lg transition-colors"
                    },
                        React.createElement('svg', { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                            React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h16M4 12h16M4 18h16" })
                        )
                    ),
                    React.createElement('h1', { className: "text-2xl font-bold" }, 'TeleScribe Assist')
                ),
                React.createElement('div', { className: "flex items-center gap-2" },
                    React.createElement('button', {
                        onClick: undo,
                        disabled: undoStack.length === 0,
                        className: "p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50",
                        title: "元に戻す"
                    },
                        React.createElement('svg', { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                            React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" })
                        )
                    ),
                    React.createElement('button', {
                        onClick: redo,
                        disabled: redoStack.length === 0,
                        className: "p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50",
                        title: "やり直す"
                    },
                        React.createElement('svg', { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                            React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" })
                        )
                    )
                )
            )
        ),

        React.createElement('div', { className: "flex flex-1 overflow-hidden min-h-0" },
            // サイドバー（コンポーネント化）
            React.createElement(Components.SessionSidebar, {
                open: sidebarOpen,
                sessionHistory: sessionHistory,
                onToggle: () => setSidebarOpen(!sidebarOpen),
                onNew: () => {
                    setSegments([{ id: Helpers.generateId(), content: '' }]);
                    setVariables([{
                        id: Helpers.generateId(),
                        name: '着信時刻',
                        type: 'time',
                        value: DateUtils.formatDateTime(new Date(), 'HH:mm', {
                            enabled: true,
                            unit: '5',
                            method: 'floor'
                        }),
                        format: 'HH:mm',
                        rounding: {
                            enabled: true,
                            unit: '5',
                            method: 'floor'
                        }
                    }]);
                },
                onLoad: (session) => {
                    setSegments(session.segments);
                    setVariables(session.variables);
                },
                onOpenTemplateManager: () => setShowTemplateManager(true),
                onOpenDataManagement: () => setShowDataManagement(true)
            }),

            // メインコンテンツ
            React.createElement('div', { className: "flex-1 flex gap-4 p-4 overflow-hidden min-h-0" },
                // 左パネル
                React.createElement('div', { className: "flex-1 flex flex-col gap-4 min-w-0 min-h-0" },
                    // プレビューセクション（コンポーネント化）
                    React.createElement(Components.PreviewPane, {
                        preview: preview,
                        previewRef: previewRef,
                        onChange: (text) => { if (preview !== text) handlePreviewChange(text); },
                        onCopyFormatChange: (format) => copyToClipboard(format),
                        onCopyButtonClick: handleCopyButtonClick
                    }),

                    // 基本情報セクション（コンポーネント化）
                    React.createElement(Components.VariablesPanel, {
                        variables: variables,
                        variableUsageInfo: variableUsageInfo,
                        onUpdate: (index, updated) => {
                            const newVariables = [...variables];
                            newVariables[index] = updated;
                            setVariables(newVariables);
                        },
                        onDelete: (variableId) => {
                            const impact = Helpers.analyzeVariableDeletionImpact(variableId, variables, segments);
                            if (impact.canDelete || confirm(impact.warningMessage)) {
                                setVariables(variables.filter(v => v.id !== variableId));
                                saveToUndoStack();
                            }
                        },
                        onAddClick: () => setShowVariableModal(true)
                    })
                ),

                // 右パネル
                React.createElement('div', { className: "flex-1 bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col min-h-0" },
                    React.createElement('div', { className: "gradient-accent p-3 flex-none" },
                        React.createElement('div', { className: "flex items-center justify-between gap-3 flex-wrap" },
                            React.createElement('h2', { className: "text-lg font-semibold" }, '報告文の組み立て（文節）'),
                            React.createElement('div', { className: "flex items-center gap-2" },
                                React.createElement('select', {
                                    value: selectedBlockIndex,
                                    onChange: (e) => {
                                        const idx = Number(e.target.value);
                                        setSelectedBlockIndex(idx);
                                        setBaselineBlockIndex(idx); // ブロック切替時にbaselineを更新
                                    },
                                    className: "px-2 py-1 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                },
                                    React.createElement('option', { value: -1 }, 'ブロック選択'),
                                    (templates.block || []).map((b, i) => React.createElement('option', { key: i, value: i }, b.name || `ブロック${i + 1}`))
                                ),
                                React.createElement('button', {
                                    onClick: () => {
                                        const idx = selectedBlockIndex;
                                        const block = (templates.block || [])[idx];
                                        if (!block) return;
                                        // 未保存変更がある場合は確認
                                        if (typeof window.__telescribe_hasUnsavedChanges === 'function' && window.__telescribe_hasUnsavedChanges()) {
                                            if (!confirm('未保存の変更があります。続行すると変更が失われる可能性があります。続行しますか？')) return;
                                        }
                                        saveToUndoStack();
                                        const contents = (block.segments || []).map(text => String(text ?? ''));
                                        setSegments(prev => ([...prev, ...contents.map(text => ({ id: Helpers.generateId(), content: text }))]));
                                        // 追加適用時：未登録変数を追加
                                        try {
                                            const names = TemplateUtils.extractVariableNames(contents);
                                            if (names.length > 0) {
                                                const existing = new Set(variables.map(v => v.name));
                                                const toAdd = names.filter(n => !existing.has(n));
                                                if (toAdd.length > 0) {
                                                    setVariables(prev => ([...prev, ...toAdd.map(name => ({ id: Helpers.generateId(), name, type: 'text', value: '' }))]));
                                                }
                                            }
                                        } catch (_) {}
                                        // baselineは維持（既存との差分で新規行がnew判定される）
                                    },
                                    disabled: selectedBlockIndex < 0,
                                    className: "px-3 py-1 bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50",
                                    title: "選択ブロックを末尾に追加"
                                }, '追加'),
                                React.createElement('button', {
                                    onClick: () => {
                                        const idx = selectedBlockIndex;
                                        const block = (templates.block || [])[idx];
                                        if (!block) return;
                                        // 未保存変更がある場合は確認
                                        if (typeof window.__telescribe_hasUnsavedChanges === 'function' && window.__telescribe_hasUnsavedChanges()) {
                                            if (!confirm('未保存の変更があります。続行すると変更が失われます。置換を実行しますか？')) return;
                                        }
                                        saveToUndoStack();
                                        // 置換：segmentsとvariablesをテンプレートに完全同期
                                        const contents = (block.segments || []).map(text => String(text ?? ''));
                                        const replaced = contents.map(text => ({ id: Helpers.generateId(), content: text }));
                                        setSegments(replaced);
                                        setBaselineBlockIndex(idx); // baselineを置換対象に更新
                                        // 変数の完全同期（テンプレに存在する変数だけに）
                                        try {
                                            const names = TemplateUtils.extractVariableNames(contents);
                                            const nameToVar = new Map((variables || []).map(v => [v.name, v]));
                                            const newVars = names.map(name => nameToVar.get(name) || ({ id: Helpers.generateId(), name, type: 'text', value: '' }));
                                            setVariables(newVars);
                                        } catch (_) {}
                                    },
                                    disabled: selectedBlockIndex < 0,
                                    className: "px-3 py-1 bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50",
                                    title: "選択ブロックで全置換"
                                }, '置換'),
                                React.createElement('button', {
                                    onClick: () => setShowSaveBlockModal(true),
                                    className: `px-3 py-1 rounded-md hover:bg-gray-600 ${((segmentChangeStatus.some(s => s === 'new' || s === 'edited')) || (deletionMarkers && deletionMarkers.length > 0)) ? 'bg-gray-700 relative' : 'bg-gray-700'}`,
                                    title: "現在内容をブロック保存"
                                },
                                    '保存',
                                    ((segmentChangeStatus.some(s => s === 'new' || s === 'edited')) || (deletionMarkers && deletionMarkers.length > 0)) && React.createElement('span', {
                                        className: "ml-2 inline-block w-2 h-2 rounded-full bg-yellow-400 align-middle"
                                    })
                                )
                            )
                        )
                    ),
                    React.createElement('div', { className: "p-4 flex flex-col flex-1 min-h-0" },
                        React.createElement('div', { className: "mb-2 text-xs text-gray-400 flex items-center gap-2" },
                            React.createElement('svg', { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                                React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M12 6a9 9 0 110 12 9 9 0 010-12z" })
                            ),
                            'ヒント: \u007b\u007b 入力で変数候補が開きます。Tabで選択／Enterで確定。左のハンドルで並び替えできます。'
                        ),
                        React.createElement(Components.SegmentsPane, {
                            segments: segments,
                            deletionMarkers: deletionMarkers,
                            templates: templates.segment || [],
                            inputHistory: inputHistory,
                            variables: variables,
                            onUpdate: updateSegment,
                            onDelete: deleteSegment,
                            onAdd: addSegment,
                            onCommitVariables: (committedText) => {
                                try {
                                    const names = TemplateUtils.extractVariableNames(committedText);
                                    if (names.length > 0) {
                                        const existingNames = new Set(variables.map(v => v.name));
                                        const toAdd = names.filter(name => !existingNames.has(name));
                                        if (toAdd.length > 0) {
                                            setVariables(prev => ([
                                                ...prev,
                                                ...toAdd.map(name => ({ id: Helpers.generateId(), name, type: 'text', value: '' }))
                                            ]));
                                        }
                                    }
                                } catch (_) {}
                            },
                            changeStatus: segmentChangeStatus,
                            onAddLineButton: () => {
                                setSegments([...segments, { id: Helpers.generateId(), content: '' }]);
                                saveToUndoStack();
                            }
                        })
                    ),
                )
            )
        ),

        // トースト（右下固定表示）
        toastState.visible && React.createElement('div', { className: "fixed bottom-4 right-4 z-50" },
            React.createElement('div', { className: "pointer-events-auto px-4 py-2 bg-gray-800/95 text-white rounded shadow-lg border-l-4 border-green-400" },
                toastState.message
            )
        ),

        // モーダル
        showVariableModal && React.createElement(Components.VariableModal, {
            variables: variables,
            setVariables: setVariables,
            setShowVariableModal: setShowVariableModal,
            saveToUndoStack: saveToUndoStack
        }),
        showSaveBlockModal && React.createElement(Components.SaveBlockTemplateModal, {
            isOpen: showSaveBlockModal,
            onClose: () => setShowSaveBlockModal(false),
            existingBlocks: templates.block || [],
            defaultMode: selectedBlockIndex >= 0 ? 'overwrite' : 'new',
            defaultOverwriteIndex: selectedBlockIndex,
            onSave: ({ name, mode, overwriteIndex }) => {
                const segs = segments.map(s => String(s.content ?? ''));
                if (segs.length === 0) {
                    setShowSaveBlockModal(false);
                    return;
                }
                if (mode === 'overwrite' && overwriteIndex >= 0 && (templates.block || [])[overwriteIndex]) {
                    setTemplates(prev => ({
                        ...prev,
                        block: (prev.block || []).map((b, i) => i === overwriteIndex ? { name: name || (b.name || '無題ブロック'), segments: segs } : b)
                    }));
                    // 上書き保存後：そのブロックを選択状態にし、ステータスを全て未変更にする
                    setSelectedBlockIndex(overwriteIndex);
                    setBaselineBlockIndex(overwriteIndex);
                } else {
                    const newBlock = { name: name || '無題ブロック', segments: segs };
                    setTemplates(prev => ({
                        ...prev,
                        block: [...(prev.block || []), newBlock]
                    }));
                    // 新規保存時：直近追加ブロックを選択状態にし、ステータスを全て未変更にする
                    const newIndex = (templates.block ? templates.block.length : 0);
                    setSelectedBlockIndex(newIndex);
                    setBaselineBlockIndex(newIndex);
                }
                setShowSaveBlockModal(false);
            }
        }),
        showTemplateManager && React.createElement(Components.TemplateManagerModal, {
            templates: templates,
            setTemplates: setTemplates,
            isOpen: showTemplateManager,
            onClose: () => setShowTemplateManager(false),
            onApplyBlock: (block, mode) => {
                // ブロックテンプレート適用処理
                const contents = (block?.segments || []).map(s => String(s ?? ''));
                if (contents.length === 0) return;

                saveToUndoStack();

                if (mode === 'replace') {
                    setSegments(contents.map(text => ({ id: Helpers.generateId(), content: text })));
                    // 変数の完全同期（テンプレに存在する変数だけに）
                    try {
                        const names = TemplateUtils.extractVariableNames(contents);
                        const nameToVar = new Map((variables || []).map(v => [v.name, v]));
                        const newVars = names.map(name => nameToVar.get(name) || ({ id: Helpers.generateId(), name, type: 'text', value: '' }));
                        setVariables(newVars);
                    } catch (_) {}
                } else {
                    setSegments(prev => ([...prev, ...contents.map(text => ({ id: Helpers.generateId(), content: text }))]));
                    // 追加適用時：未登録変数を追加
                    try {
                        const names = TemplateUtils.extractVariableNames(contents);
                        if (names.length > 0) {
                            const existing = new Set(variables.map(v => v.name));
                            const toAdd = names.filter(n => !existing.has(n));
                            if (toAdd.length > 0) {
                                setVariables(prev => ([...prev, ...toAdd.map(name => ({ id: Helpers.generateId(), name, type: 'text', value: '' }))]));
                            }
                        }
                    } catch (_) {}
                }

                setShowTemplateManager(false);
            }
        }),
        showDataManagement && React.createElement(Components.DataManagementModal, {
            isOpen: showDataManagement,
            onClose: () => setShowDataManagement(false),
            currentData: { variables, segments, templates, inputHistory },
            onExportAll: () => DataService.exportData(variables, segments, templates, inputHistory),
            onExportBlocks: () => DataService.exportBlocks(templates.block || []),
            onImport: ({ file, mode }) => {
                try { saveToUndoStack(); } catch (_) {}
                DataService.importDataWithMode(file, mode, { variables, segments, templates, inputHistory }, {
                    setVariables,
                    setSegments,
                    setTemplates,
                    setInputHistory
                });
            }
        })
    );
}

/**
 * グローバルスコープへの公開
 * モジュラー構成でのコンポーネント参照を可能にする
 */
window.Components = window.Components || {};
window.Components.App = App;