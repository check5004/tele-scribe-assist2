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
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showVariableModal, setShowVariableModal] = useState(false);
    const [showTemplateManager, setShowTemplateManager] = useState(false);
    const [showDataManagement, setShowDataManagement] = useState(false);
    const [showSaveBlockModal, setShowSaveBlockModal] = useState(false);
    /**
     * 変数編集モーダル状態
     * - 編集対象の変数ID
     * - モーダル表示フラグ
     */
    const [editingVariableId, setEditingVariableId] = useState(null);
    const [showVariableEditModal, setShowVariableEditModal] = useState(false);
    const [selectedBlockIndex, setSelectedBlockIndex] = useState(-1);
    const [templates, setTemplates] = useState(
        initialData?.templates || Constants.SAMPLE_TEMPLATES
    );
    // 入力履歴（不足キーを補完）
    const [inputHistory, setInputHistory] = useState(() => {
        const raw = initialData?.inputHistory || Constants.INITIAL_INPUT_HISTORY;
        return Helpers.ensureInputHistoryShape ? Helpers.ensureInputHistoryShape(raw) : raw;
    });
    // グループ補完・表示用サジェスト（専用フック）
    const { variableSuggestions, commitVariableValue } = Hooks.useGroupSuggestions(variables, inputHistory);

    // グループ補完の算出は useGroupSuggestions に移譲
    const [variableUsageInfo, setVariableUsageInfo] = useState({
        unusedVariables: [],
        usedVariables: [],
        variableUsage: {}
    });
    const [unifiedSegments, setUnifiedSegments] = useState([]);
    const [baselineBlockIndex, setBaselineBlockIndex] = useState(-1); // 比較対象のブロックインデックス
    const { segmentChangeStatus, deletionMarkers } = Hooks.useDiffStatus(segments, templates, selectedBlockIndex, baselineBlockIndex);

    // テーマ（専用フックへ移譲）
    const { theme, toggleTheme } = Hooks.useTheme();

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

    // トースト（専用フックへ移譲）
    const { toastState, showToast } = Hooks.useToast();

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
     * 文節変更時の自動ブロック選択
     * 文節ブロックDDLが未選択（selectedBlockIndex === -1）のとき、
     * 現在の文節配列と保存済みブロックの文節配列が「完全一致」するブロックを探索し、
     * 一致が見つかった場合に該当ブロックを自動的に選択状態にする。
     *
     * 仕様背景:
     * - セッション履歴の復元等により、内容は定型ブロックと一致しているがDDLが未選択のケースがある
     * - 保存状態や差分UIを正しく反映するため、自動選択で同期させる
     *
     * トリガー:
     * - 文節セクションに何らかの変更があったとき（追加・削除・編集・並び替え等）
     */
    Hooks.useAutoSelectBlock(segments, templates, selectedBlockIndex, setSelectedBlockIndex, setBaselineBlockIndex);

    // 文節変更ステータスの再計算は useDiffStatus に移譲

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
        // テキスト編集もUndo対象とするため、適用前に履歴を保存
        try { saveToUndoStack(); } catch (_) {}
        setSegments(prev => prev.map((seg, i) => (
            i === index ? { ...seg, content } : seg
        )));
    }, [saveToUndoStack]);

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
     * 同時に現在の状態をセッション履歴に保存する。
     * 直前履歴と内容（content）が完全一致する場合は、重複追加せず
     * 先頭要素の更新日時（timestamp）のみを上書きする。
     *
     * @param {string} format - コピー形式（plain、markdown、html）
     * @returns {void}
     */
    const copyToClipboard = (format = 'plain') => {
        DataService.copyToClipboard(preview, format);

        // セッション履歴の重複排除（直前と完全一致ならtimestampのみ更新）
        setSessionHistory((prev) => {
            const nowIso = new Date().toISOString();
            const last = (prev && prev.length > 0) ? prev[0] : null;
            const currentContent = String(preview ?? '');
            if (last && String(last.content ?? '') === currentContent) {
                // 直前と完全一致：先頭のtimestampのみ上書き
                const updatedFirst = { ...last, timestamp: nowIso };
                return [updatedFirst, ...prev.slice(1)];
            }

            // 新規追加（最大50件まで保持）
            const newSession = {
                id: Helpers.generateId(),
                timestamp: nowIso,
                content: currentContent,
                variables: [...variables],
                segments: [...segments],
                favorite: false
            };
            return [newSession, ...(prev || [])].slice(0, 50);
        });
    };

    /**
     * セッション履歴の「お気に入り」トグル
     * 指定IDのセッションについて favorite フラグを切り替える（nextが指定されればそれを優先）
     *
     * @param {string} sessionId - 対象セッションのID
     * @param {boolean} [next] - 次の状態（省略時は現在値を反転）
     * @returns {void}
     */
    const toggleSessionFavorite = useCallback((sessionId, next) => {
        setSessionHistory(prev => (prev || []).map(s => {
            if (!s || s.id !== sessionId) return s;
            const current = !!s.favorite;
            const nextValue = (typeof next === 'boolean') ? next : !current;
            return { ...s, favorite: nextValue };
        }));
    }, []);

    /**
     * プレビューの全体コピー（ボタン押下用）
     * プレーンテキストでコピーし、完了トーストを表示
     *
     * 通知は明示的なボタン操作に限定
     *
     * @returns {void}
     */
    const handleCopyButtonClick = useCallback(() => {
        copyToClipboard('plain');
        // グループ保存（空文字含め完全スナップショット）
        try {
            const snapshot = Object.fromEntries((variables || []).map(v => [v.name, String(v.value ?? '')]));
            setInputHistory(prev => {
                const shaped = Helpers.ensureInputHistoryShape(prev);
                const groups = Array.isArray(shaped.valueGroups) ? shaped.valueGroups.slice() : [];
                const last = groups[0];
                const isSameAsLast = last && JSON.stringify(last?.variables || {}) === JSON.stringify(snapshot);
                if (!isSameAsLast) {
                    groups.unshift({ id: Helpers.generateId(), savedAt: new Date().toISOString(), variables: snapshot });
                }
                // 上限200
                const MAX_GROUPS = 200;
                const trimmed = groups.slice(0, MAX_GROUPS);
                return { ...shaped, valueGroups: trimmed };
            });
        } catch (_) {}
        showToast('コピーしました');
    }, [copyToClipboard, showToast, variables, setInputHistory]);

    /**
     * 変数編集モーダルを開く
     * @param {string} variableId - 編集対象変数のID
     */
    const openVariableEditModal = useCallback((variableId) => {
        setEditingVariableId(variableId);
        setShowVariableEditModal(true);
    }, []);

    /**
     * 変数編集の適用処理
     * - 変数名変更に伴い、全セグメント内の `{{旧名}}` を `{{新名}}` に置換
     * - プレビューは usePreviewSync により自動再生成
     * - タイプ変更が time の場合、フォーマット・丸め設定を既定値で付与
     *
     * @param {{id:string, name:string, type:string}} updated - 更新後の変数情報
     * @returns {void}
     */
    const applyVariableEdit = useCallback((updated) => {
        try {
            const idx = variables.findIndex(v => v.id === updated.id);
            if (idx === -1) return;

            const prevVar = variables[idx];
            const oldName = String(prevVar.name || '');
            const newName = String(updated.name || '');

            // 1) 変数配列を更新
            const nextVariables = [...variables];
            nextVariables[idx] = {
                ...prevVar,
                name: newName,
                type: updated.type,
                ...(updated.type === 'time' && {
                    formatMode: prevVar.formatMode || 'preset',
                    format: prevVar.format || 'HH:mm',
                    rounding: prevVar.rounding || { enabled: false, unit: '5', method: 'floor' }
                })
            };

            // 2) 文節内の {{旧名}} → {{新名}} を一括置換（厳密一致）
            const re = new RegExp(`\\{\\{\\s*${Helpers.escapeRegExp(oldName)}\\s*\\}\\}`, 'g');
            const nextSegments = segments.map(seg => ({
                ...seg,
                content: String(seg.content ?? '').replace(re, `{{${newName}}}`)
            }));

            // 3) 状態反映とUndo
            saveToUndoStack();
            setVariables(nextVariables);
            setSegments(nextSegments);

            // 4) モーダル閉じる
            setShowVariableEditModal(false);
            setEditingVariableId(null);
        } catch (_) {}
    }, [variables, segments, setVariables, setSegments, saveToUndoStack]);

    return React.createElement('div', { className: "h-screen bg-gray-900 text-gray-100 flex flex-col overflow-y-auto lg:overflow-hidden" },
        // ヘッダー
        React.createElement('header', { className: "gradient-title px-6 py-4 shadow-lg" },
            React.createElement('div', { className: "flex items-center justify-between" },
                React.createElement('div', { className: "flex items-center gap-4" },
                    React.createElement('button', {
                        onClick: () => setSidebarOpen(!sidebarOpen),
                        className: "p-2 hover:bg-white/10 rounded-lg transition-colors",
                        'aria-controls': 'session-sidebar',
                        'aria-expanded': sidebarOpen ? 'true' : 'false',
                        title: "サイドバーの開閉"
                    },
                        React.createElement('svg', { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                            React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h16M4 12h16M4 18h16" })
                        )
                    ),
                    React.createElement('h1', { className: "text-2xl font-bold" }, 'TeleScribe Assist'),
                    React.createElement('a', {
                        href: 'https://github.com/check5004/tele-scribe-assist2',
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        className: 'p-2 hover:bg-white/10 rounded-lg transition-colors',
                        'aria-label': 'GitHub リポジトリ',
                        title: 'GitHub リポジトリ'
                    },
                        React.createElement('svg', { className: 'w-6 h-6', fill: 'currentColor', viewBox: '0 0 24 24', 'aria-hidden': true },
                            React.createElement('path', { d: 'M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.185 6.839 9.504.5.093.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.004.071 1.531 1.032 1.531 1.032.892 1.53 2.341 1.087 2.91.832.091-.647.35-1.086.636-1.337-2.221-.253-4.555-1.113-4.555-4.952 0-1.093.39-1.987 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026a9.564 9.564 0 012.5-.337 9.56 9.56 0 012.5.337c1.91-1.296 2.75-1.026 2.75-1.026.544 1.378.201 2.397.098 2.65.64.701 1.028 1.595 1.028 2.688 0 3.847-2.337 4.696-4.566 4.943.359.31.678.923.678 1.861 0 1.343-.012 2.428-.012 2.758 0 .268.18.58.688.481A10.025 10.025 0 0022 12.021C22 6.484 17.523 2 12 2z' })
                        )
                    )
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
                    ),
                    // テーマ切替ボタン（ライト/ダーク）
                    React.createElement('button', {
                        onClick: toggleTheme,
                        className: "p-2 hover:bg-white/10 rounded-lg transition-colors",
                        title: theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え',
                        'aria-label': 'テーマ切り替え',
                        'aria-pressed': theme === 'light' ? 'true' : 'false'
                    },
                        theme === 'light'
                            ? React.createElement('svg', { className: "w-5 h-5", fill: "currentColor", viewBox: "0 0 20 20", 'aria-hidden': true },
                                React.createElement('path', { d: "M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 2.47a1 1 0 011.42 1.42l-.7.7a1 1 0 01-1.42-1.42l.7-.7zM17 9a1 1 0 100 2h1a1 1 0 100-2h-1zM4 9a1 1 0 100 2H3a1 1 0 100-2h1zm1.05-4.53a1 1 0 011.4.02l.71.7a1 1 0 01-1.42 1.42l-.7-.71a1 1 0 01.01-1.43zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm6.36-2.64a1 1 0 010 1.41l-.71.71a1 1 0 11-1.41-1.41l.71-.71a1 1 0 011.41 0zM6.05 14.36a1 1 0 010 1.41l-.71.71a1 1 0 01-1.41-1.41l.71-.71a1 1 0 011.41 0zM10 6a4 4 0 100 8 4 4 0 000-8z" })
                            )
                            : React.createElement('svg', { className: "w-5 h-5", fill: "currentColor", viewBox: "0 0 20 20", 'aria-hidden': true },
                                React.createElement('path', { d: "M17.293 13.293A8 8 0 016.707 2.707 8.001 8.001 0 1017.293 13.293z" })
                            )
                    ),
                    // バージョン表示（薄く小さく右上）
                    (typeof window !== 'undefined' && window.__APP_VERSION__)
                        ? React.createElement('span', { className: "ml-2 text-[11px] leading-none text-white/40" }, `v ${String(window.__APP_VERSION__)}`)
                        : null
                )
            )
        ),

        // モバイル用バックドロップ（サイドバー開放時のみ表示）
        sidebarOpen && React.createElement('div', {
            className: "fixed inset-0 bg-black/50 z-30 lg:hidden",
            onClick: () => setSidebarOpen(false),
            'aria-hidden': true
        }),

        React.createElement('div', { className: "flex flex-1 lg:overflow-hidden lg:min-h-0 overflow-visible" },
            // サイドバー（コンポーネント化）
            React.createElement(Components.SessionSidebar, {
                open: sidebarOpen,
                sessionHistory: sessionHistory,
                onToggle: () => setSidebarOpen(!sidebarOpen),
                onNew: () => {
                    try { saveToUndoStack(); } catch (_) {}
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
                        formatMode: 'preset',
                        format: 'HH:mm',
                        rounding: {
                            enabled: true,
                            unit: '5',
                            method: 'floor'
                        }
                    }]);
                },
                onLoad: async (session) => {
                    // セッション履歴適用前の確認ダイアログ
                    // 未保存変更がある場合は強い警告、それ以外でも確認
                    try {
                        const hasUnsaved = (typeof window.__telescribe_hasUnsavedChanges === 'function') && window.__telescribe_hasUnsavedChanges();
                        const message = hasUnsaved
                            ? '未保存の変更があります。続行すると現在の編集内容が失われる可能性があります。履歴を適用しますか？'
                            : 'このセッション履歴を適用しますか？';
                        const ok = await window.UI.confirm({ title: '履歴の適用', message });
                        if (!ok) return;
                    } catch (_) {}
                    try { saveToUndoStack(); } catch (_) {}
                    setSegments(session.segments);
                    setVariables(session.variables);
                },
                onToggleFavorite: (sessionId, next) => toggleSessionFavorite(sessionId, next),
                onOpenTemplateManager: () => setShowTemplateManager(true),
                onOpenDataManagement: () => setShowDataManagement(true)
            }),

            // メインコンテンツ（狭幅: 縦並び / 広幅: 横並び）
            React.createElement('div', { className: "flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:overflow-hidden lg:min-h-0 overflow-visible" },
                // 左パネル
                React.createElement('div', { className: "flex flex-col gap-4 min-w-0 w-full lg:w-1/2 lg:flex-1 lg:min-h-0" },
                    // プレビューセクション（コンポーネント化）
                    React.createElement(Components.PreviewPane, {
                        preview: preview,
                        previewRef: previewRef,
                        onChange: (text) => { if (preview !== text) handlePreviewChange(text); },
                        onCopyButtonClick: handleCopyButtonClick,
                        segments: segments,
                        variables: variables,
                        onCommitVariables: (committedText) => {
                            try {
                                const next = (window.Helpers && typeof window.Helpers.addMissingVariablesFromText === 'function')
                                    ? window.Helpers.addMissingVariablesFromText(committedText, variables)
                                    : variables;
                                if (next !== variables) {
                                    try { saveToUndoStack(); } catch (_) {}
                                    setVariables(next);
                                }
                            } catch (_) {}
                        }
                    }),

                    // 基本情報セクション（コンポーネント化）
                    React.createElement(Components.VariablesPanel, {
                        variables: variables,
                        variableUsageInfo: variableUsageInfo,
                        onUpdate: (index, updated) => {
                            // 変数値編集もUndo対象
                            try { saveToUndoStack(); } catch (_) {}
                            const newVariables = [...variables];
                            newVariables[index] = updated;
                            setVariables(newVariables);
                        },
                        onDelete: async (variableId) => {
                            const impact = Helpers.analyzeVariableDeletionImpact(variableId, variables, segments);
                            const canProceed = impact.canDelete || await window.UI.confirm({ title: '変数の削除', message: impact.warningMessage, okText: '削除する' });
                            if (canProceed) {
                                setVariables(variables.filter(v => v.id !== variableId));
                                saveToUndoStack();
                            }
                        },
                        onEdit: (variableId) => openVariableEditModal(variableId),
                        onAddClick: () => setShowVariableModal(true),
                        showToast: showToast,
                        onCommitValue: commitVariableValue,
                        suggestions: variableSuggestions
                    })
                ),

                // 右パネル
                React.createElement('div', { className: "bg-gray-800 rounded-lg shadow-xl flex flex-col w-full lg:w-1/2 lg:flex-1 lg:min-h-0 lg:overflow-hidden" },
                    React.createElement('div', { className: "gradient-accent p-3 flex-none rounded-t-lg" },
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
                                    className: "px-2 py-1 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                                    tabIndex: -1
                                },
                                    React.createElement('option', { value: -1 }, 'ブロック選択'),
                                    (templates.block || []).map((b, i) => React.createElement('option', { key: i, value: i }, b.name || `ブロック${i + 1}`))
                                ),
                                React.createElement('button', {
                                    onClick: async () => {
                                        const idx = selectedBlockIndex;
                                        const block = (templates.block || [])[idx];
                                        if (!block) return;
                                        // 未保存変更確認
                                        if (typeof window.__telescribe_hasUnsavedChanges === 'function' && window.__telescribe_hasUnsavedChanges()) {
                                            const ok = await window.UI.confirm({ title: '未保存の変更', message: '未保存の変更があります。続行すると変更が失われる可能性があります。続行しますか？' });
                                            if (!ok) return;
                                        }
                                        Hooks.useTemplateOps({ variables, setVariables, segments, setSegments, templates, setBaselineBlockIndex, saveToUndoStack }).applyAppendByIndex(idx);
                                    },
                                    disabled: selectedBlockIndex < 0,
                                    className: "px-3 py-1 bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50",
                                    tabIndex: -1,
                                    title: "選択ブロックを末尾に追加"
                                }, '追加'),
                                React.createElement('button', {
                                    onClick: async () => {
                                        const idx = selectedBlockIndex;
                                        const block = (templates.block || [])[idx];
                                        if (!block) return;
                                        if (typeof window.__telescribe_hasUnsavedChanges === 'function' && window.__telescribe_hasUnsavedChanges()) {
                                            const ok = await window.UI.confirm({ title: '未保存の変更', message: '未保存の変更があります。続行すると変更が失われます。置換を実行しますか？', okText: '置換する' });
                                            if (!ok) return;
                                        }
                                        Hooks.useTemplateOps({ variables, setVariables, segments, setSegments, templates, setBaselineBlockIndex, saveToUndoStack }).applyReplaceByIndex(idx);
                                    },
                                    disabled: selectedBlockIndex < 0,
                                    className: "px-3 py-1 bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50",
                                    tabIndex: -1,
                                    title: "選択ブロックで全置換"
                                }, '置換'),
                                React.createElement('button', {
                                    onClick: () => setShowSaveBlockModal(true),
                                    className: `px-3 py-1 rounded-md hover:bg-gray-600 ${((segmentChangeStatus.some(s => s === 'new' || s === 'edited')) || (deletionMarkers && deletionMarkers.length > 0)) ? 'bg-gray-700 relative' : 'bg-gray-700'}`,
                                    tabIndex: -1,
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
                    React.createElement('div', { className: "p-4 flex flex-col lg:flex-1 lg:min-h-0" },
                        React.createElement('div', { className: "mb-2 text-xs text-gray-400 flex items-center gap-2" },
                            React.createElement('svg', { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                                React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M12 6a9 9 0 110 12 9 9 0 010-12z" })
                            ),
                            'ヒント: \u007b\u007b 入力で変数候補が開きます。↑↓で選択／Enterで確定。左のハンドルで並び替えできます。'
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
                                    const next = (window.Helpers && typeof window.Helpers.addMissingVariablesFromText === 'function')
                                        ? window.Helpers.addMissingVariablesFromText(committedText, variables)
                                        : variables;
                                    if (next !== variables) {
                                        try { saveToUndoStack(); } catch (_) {}
                                        setVariables(next);
                                    }
                                } catch (_) {}
                            },
                            changeStatus: segmentChangeStatus,
                            onAddLineButton: () => {
                                try { saveToUndoStack(); } catch (_) {}
                                setSegments([...segments, { id: Helpers.generateId(), content: '' }]);
                            }
                        })
                    ),
                )
            )
        ),

        // トースト（上部中央固定表示）
        toastState.visible && React.createElement('div', { className: "fixed top-4 left-1/2 -translate-x-1/2 z-50" },
            React.createElement('div', { className: "pointer-events-auto px-4 py-2 bg-gray-800/95 text-white rounded shadow-lg border-l-4 border-green-400" },
                toastState.message
            )
        ),

        // モーダル
        showVariableModal && React.createElement(Components.VariableModal, {
            variables: variables,
            setVariables: setVariables,
            setShowVariableModal: setShowVariableModal,
            saveToUndoStack: saveToUndoStack,
            inputHistory: inputHistory,
            onRegisterVariableName: (name) => {
                try {
                    if (!name) return;
                    const MAX_NAME = 200;
                    setInputHistory(prev => {
                        const shaped = Helpers.ensureInputHistoryShape(prev);
                        const names = Helpers.pushUniqueFront(shaped.variableNames || [], String(name), MAX_NAME);
                        return { ...shaped, variableNames: names };
                    });
                } catch (_) {}
            }
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
                Hooks.useTemplateOps({ variables, setVariables, segments, setSegments, templates, setBaselineBlockIndex, saveToUndoStack }).applyBlock(block, mode);
                setShowTemplateManager(false);
            }
        }),
        showDataManagement && React.createElement(Components.DataManagementModal, {
            isOpen: showDataManagement,
            onClose: () => setShowDataManagement(false),
            currentData: { variables, segments, templates, inputHistory },
            onExportAll: () => { DataService.exportData(variables, segments, templates, inputHistory); try { showToast('エクスポートしました'); } catch (_) {} },
            onExportBlocks: () => { DataService.exportBlocks(templates.block || []); try { showToast('ブロックをエクスポートしました'); } catch (_) {} },
            onImport: async ({ file, mode }) => {
                try { saveToUndoStack(); } catch (_) {}
                const result = await DataService.importDataWithModeAsync(file, mode, { variables, segments, templates, inputHistory }, {
                    setVariables,
                    setSegments,
                    setTemplates,
                    setInputHistory
                });
                try {
                    if (result && typeof result.message === 'string' && result.message) {
                        showToast(result.message);
                    }
                } catch (_) {}
            }
        }),
        // 変数編集モーダル
        showVariableEditModal && React.createElement(Components.VariableEditModal, {
            isOpen: showVariableEditModal,
            onClose: () => { setShowVariableEditModal(false); setEditingVariableId(null); },
            variable: variables.find(v => v.id === editingVariableId),
            variables: variables,
            onApply: applyVariableEdit
        })
    );
}

/**
 * グローバルスコープへの公開
 * モジュラー構成でのコンポーネント参照を可能にする
 */
window.Components = window.Components || {};
window.Components.App = App;