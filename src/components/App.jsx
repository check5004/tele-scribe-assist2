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
    const [preview, setPreview] = useState('');
    const [sessionHistory, setSessionHistory] = useState(initialData?.sessionHistory || []);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showVariableModal, setShowVariableModal] = useState(false);
    const [showTemplateManager, setShowTemplateManager] = useState(false);
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

    /**
     * 行の類似性判定
     * 完全一致は常に類似とみなし、それ以外は2文字以上の連続部分文字列が共通する場合に類似と判定
     * @param {string} a
     * @param {string} b
     * @returns {boolean}
     */
    function linesAreSimilar(a, b) {
        if (a === b) return true;
        // 最長共通部分文字列の長さが2以上なら類似
        const lenA = a.length;
        const lenB = b.length;
        if (lenA === 0 || lenB === 0) return false;
        const prev = new Array(lenB + 1).fill(0);
        const curr = new Array(lenB + 1).fill(0);
        let longest = 0;
        for (let i = 1; i <= lenA; i += 1) {
            for (let j = 1; j <= lenB; j += 1) {
                if (a[i - 1] === b[j - 1]) {
                    curr[j] = prev[j - 1] + 1;
                    if (curr[j] > longest) longest = curr[j];
                } else {
                    curr[j] = 0;
                }
            }
            // スワップ
            for (let j = 0; j <= lenB; j += 1) prev[j] = curr[j];
        }
        return longest >= 2;
    }

    /**
     * 類似性ベースのLCS整列（Git風）
     * - 類似行はマッチ（編集扱い）
     * - 類似しない基準行は削除（赤ハイフン）
     * - 類似しない現在行は追加（new）
     * @param {string[]} baselineLines
     * @param {string[]} currentLines
     * @returns {{pairs: Array<[number, number]>, deletions: number[]}}
     */
    function computeDiffAlignment(baselineLines, currentLines) {
        const m = baselineLines.length;
        const n = currentLines.length;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = m - 1; i >= 0; i -= 1) {
            for (let j = n - 1; j >= 0; j -= 1) {
                if (linesAreSimilar(String(baselineLines[i] ?? ''), String(currentLines[j] ?? ''))) {
                    dp[i][j] = dp[i + 1][j + 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
                }
            }
        }
        const positions = new Set();
        const pairs = [];
        let i = 0;
        let j = 0;
        while (i < m || j < n) {
            if (i < m && j < n && linesAreSimilar(String(baselineLines[i] ?? ''), String(currentLines[j] ?? ''))) {
                pairs.push([i, j]);
                i += 1; j += 1;
            } else if (i < m && (j === n || dp[i + 1][j] >= dp[i][j + 1])) {
                // baselineにのみ存在 → 削除
                positions.add(j);
                i += 1;
            } else if (j < n) {
                // currentにのみ存在 → 追加
                j += 1;
            }
        }
        return { pairs, deletions: Array.from(positions).sort((a, b) => a - b) };
    }

    /**
     * プレビュー編集制御の状態管理
     * 循環的な状態更新を防止し、カーソル位置を保持するための制御フラグとref
     */
    const [isEditingPreview, setIsEditingPreview] = useState(false);
    const previewRef = useRef(null);
    const cursorPositionRef = useRef({ start: 0, end: 0 });

    /**
     * カスタムフックの初期化
     * Undo/Redo機能とドラッグ&ドロップ機能を設定
     */
    const { undoStack, redoStack, saveToUndoStack, undo, redo } = Hooks.useUndoRedo(
        segments, variables, setSegments, setVariables
    );

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
        const { pairs, deletions } = computeDiffAlignment(baseline.map(s => String(s ?? '')), current);
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

    /**
     * プレビューの自動更新
     * セグメントまたは変数が変更されるたびにプレビューテキストを再生成
     * 変数の置換処理（{{変数名}}パターンを実際の値に置換）を実行
     * プレビュー編集中は自動更新を停止して循環的な状態更新を防止
     */
    useEffect(() => {
        // プレビュー編集中は自動更新を停止
        if (!isEditingPreview) {
            let text = segments.map(segment => {
                let content = segment.content;
                variables.forEach(variable => {
                    const regex = new RegExp(`{{${variable.name}}}`, 'g');
                    content = content.replace(regex, variable.value || `{{${variable.name}}}`);
                });
                return content;
            }).join('\n');
            setPreview(text);
        }
    }, [segments, variables, isEditingPreview]);

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

    /**
     * カーソル位置保存関数
     * プレビュー編集前にカーソル位置を記録し、後で復元できるようにする
     */
    const saveCursorPosition = useCallback(() => {
        if (previewRef.current) {
            const textarea = previewRef.current;
            cursorPositionRef.current = {
                start: textarea.selectionStart,
                end: textarea.selectionEnd
            };
        }
    }, []);

    /**
     * カーソル位置復元関数
     * 保存されたカーソル位置を復元し、編集中断を防ぐ
     */
    const restoreCursorPosition = useCallback(() => {
        if (previewRef.current) {
            const textarea = previewRef.current;
            const { start, end } = cursorPositionRef.current;
            // DOM更新後に実行するためrequestAnimationFrameを使用
            requestAnimationFrame(() => {
                textarea.setSelectionRange(start, end);
                textarea.focus();
            });
        }
    }, []);

    /**
     * デバウンス処理されたプレビュー同期関数
     * 連続入力時の過剰な状態更新を防ぎ、編集完了後に同期を実行
     */
    const debouncedPreviewSync = useMemo(
        () => Helpers.debounce((editedPreview) => {
            // カーソル位置を保存
            saveCursorPosition();

            // プレビュー編集からセグメント内容と変数値の両方を同期更新
            const result = Helpers.updateSegmentsAndVariablesFromPreview(
                editedPreview,
                variables,
                segments
            );

            // 状態を更新（セグメント内容と変数値）
            setVariables(result.variables);
            setSegments(result.segments);

            // プレビュー編集フラグを解除（useEffectによる自動更新を再開）
            setIsEditingPreview(false);

            // カーソル位置を復元
            setTimeout(restoreCursorPosition, 0);
        }, 100),
        [variables, segments, saveCursorPosition, restoreCursorPosition]
    );

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
                    ),
                    React.createElement('button', {
                        onClick: () => DataService.exportData(variables, segments, templates, inputHistory),
                        className: "p-2 hover:bg-white/10 rounded-lg transition-colors",
                        title: "エクスポート"
                    },
                        React.createElement('svg', { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                            React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" })
                        )
                    ),
                    React.createElement('label', { className: "p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer", title: "インポート" },
                        React.createElement('svg', { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                            React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" })
                        ),
                        React.createElement('input', {
                            type: "file",
                            accept: ".json",
                            onChange: (e) => DataService.importData(e, setVariables, setSegments, setTemplates, setInputHistory),
                            className: "hidden"
                        })
                    )
                )
            )
        ),

        React.createElement('div', { className: "flex flex-1 overflow-hidden min-h-0" },
            // サイドバー
            React.createElement('div', { className: `${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-gray-800 overflow-hidden` },
                React.createElement('div', { className: "p-4" },
                    React.createElement('h2', { className: "text-lg font-semibold mb-4" }, 'セッション履歴'),
                    React.createElement('button', {
                        onClick: () => {
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
                        className: "w-full px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors mb-4"
                    }, '新規作成'),
                    React.createElement('div', { className: "space-y-2 max-h-96 overflow-y-auto scrollbar-thin" },
                        sessionHistory.map((session) =>
                            React.createElement('button', {
                                key: session.id,
                                onClick: () => {
                                    setSegments(session.segments);
                                    setVariables(session.variables);
                                },
                                className: "w-full text-left p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                            },
                                React.createElement('div', { className: "text-sm truncate" },
                                    session.content.split('\n')[0] || '(空の報告)'
                                ),
                                React.createElement('div', { className: "text-xs text-gray-400" },
                                    new Date(session.timestamp).toLocaleString('ja-JP')
                                )
                            )
                        )
                    ),
                    React.createElement('hr', { className: "my-4 border-gray-700" }),
                    React.createElement('div', { className: "space-y-2" },
                        React.createElement('h3', { className: "text-sm font-semibold text-gray-300" }, 'テンプレート'),
                        React.createElement('button', {
                            onClick: () => setShowTemplateManager(true),
                            className: "w-full px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                        }, 'テンプレート管理')
                    )
                )
            ),

            // メインコンテンツ
            React.createElement('div', { className: "flex-1 flex gap-4 p-4 overflow-hidden min-h-0" },
                // 左パネル
                React.createElement('div', { className: "flex-1 flex flex-col gap-4 min-w-0 min-h-0" },
                    // プレビューセクション
                    React.createElement('div', { className: "bg-gray-800 rounded-lg shadow-xl overflow-hidden" },
                        React.createElement('div', { className: "gradient-accent p-3" },
                            React.createElement('div', { className: "flex items-center justify-between gap-3 flex-wrap" },
                                React.createElement('h2', { className: "text-lg font-semibold" }, 'プレビュー'),
                                React.createElement('div', { className: "flex items-center gap-2" },
                                    React.createElement('select', {
                                        onChange: (e) => copyToClipboard(e.target.value),
                                        className: "px-3 py-1.5 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    },
                                        React.createElement('option', { value: "" }, '形式選択'),
                                        React.createElement('option', { value: "plain" }, 'プレーンテキスト'),
                                        React.createElement('option', { value: "markdown" }, 'Markdown'),
                                        React.createElement('option', { value: "html" }, 'HTML')
                                    ),
                                    React.createElement('button', {
                                        onClick: handleCopyButtonClick,
                                        className: "px-3 py-1.5 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                                    }, '全体コピー')
                                )
                            )
                        ),
                        React.createElement('div', { className: "p-4" },
                        React.createElement('textarea', {
                                ref: previewRef,
                                value: preview,
                                onChange: (e) => {
                                    // プレビュー編集の新しいフロー：循環更新防止 + カーソル位置保持
                                    const editedPreview = e.target.value;

                                    if (preview !== editedPreview) {
                                        // プレビュー編集フラグを設定（useEffectによる自動更新を停止）
                                        setIsEditingPreview(true);

                                        // 即座にプレビューを更新（ユーザーの入力に対する即座のフィードバック）
                                        setPreview(editedPreview);

                                        // Undoスタックに保存（デバウンス前に実行）
                                        saveToUndoStack();

                                        // デバウンス処理された同期関数を呼び出し
                                        debouncedPreviewSync(editedPreview);
                                    }
                                },
                                className: "w-full h-48 px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 scrollbar-thin resize-none",
                                placeholder: "ここに報告文が表示されます..."
                            }),
                        )
                    ),

                    // 基本情報セクション
                    React.createElement('div', { className: "bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col min-h-0" },
                        React.createElement('div', { className: "gradient-accent p-3 flex-none" },
                            React.createElement('div', { className: "flex items-center justify-between gap-3" },
                                React.createElement('h2', { className: "text-lg font-semibold" }, '基本情報（変数）'),
                                React.createElement('button', {
                                    onClick: () => setShowVariableModal(true),
                                    className: "px-3 py-1.5 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2",
                                    title: "変数を追加"
                                },
                                    React.createElement('svg', { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                                        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 6v6m0 0v6m0-6h6m-6 0H6" })
                                    ),
                                    '変数を追加'
                                )
                            )
                        ),
                        React.createElement('div', { className: "p-4 flex flex-col flex-1 min-h-0" },
                            React.createElement('div', { className: "space-y-3 flex-1 min-h-0 overflow-y-auto scrollbar-thin px-2" },
                                variables.map((variable, index) =>
                                    React.createElement('div', { key: variable.id, className: "space-y-2" },
                                        React.createElement('div', { className: "flex items-center justify-between" },
                                            React.createElement('label', {
                                                className: `text-sm font-medium ${variableUsageInfo.unusedVariables.includes(variable.id) ? 'text-yellow-400 opacity-70' : 'text-gray-100'}`,
                                                title: variableUsageInfo.unusedVariables.includes(variable.id) ? '未使用の変数です' : '使用中の変数です'
                                            },
                                                variable.name,
                                                variableUsageInfo.unusedVariables.includes(variable.id) &&
                                                React.createElement('span', { className: "ml-2 text-xs text-yellow-300" }, '(未使用)')
                                            ),
                                            React.createElement('button', {
                                                onClick: () => {
                                                    const impact = Helpers.analyzeVariableDeletionImpact(variable.id, variables, segments);

                                                    if (impact.canDelete) {
                                                        // 未使用変数：そのまま削除
                                                        setVariables(variables.filter(v => v.id !== variable.id));
                                                        saveToUndoStack();
                                                    } else {
                                                        // 使用中変数：警告表示
                                                        if (confirm(impact.warningMessage)) {
                                                            setVariables(variables.filter(v => v.id !== variable.id));
                                                            saveToUndoStack();
                                                        }
                                                    }
                                                },
                                                className: "text-red-400 hover:text-red-300",
                                                title: "変数を削除"
                                            },
                                                React.createElement('svg', { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                                                    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })
                                                )
                                            )
                                        ),
                                        React.createElement(Components.VariableInput, {
                                            variable: variable,
                                            onChange: (updated) => {
                                                const newVariables = [...variables];
                                                newVariables[index] = updated;
                                                setVariables(newVariables);
                                            }
                                        })
                                    )
                                )
                            )
                        )
                    )
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
                                            const re = /\{\{\s*([^}\s]+)\s*\}\}/g;
                                            const found = new Set();
                                            contents.forEach(line => { let m; while ((m = re.exec(line)) !== null) { found.add(m[1]); } re.lastIndex = 0; });
                                            if (found.size > 0) {
                                                const existing = new Set(variables.map(v => v.name));
                                                const toAdd = Array.from(found).filter(n => !existing.has(n));
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
                                            const re = /\{\{\s*([^}\s]+)\s*\}\}/g;
                                            const names = [];
                                            contents.forEach(line => { let m; while ((m = re.exec(line)) !== null) { names.push(m[1]); } re.lastIndex = 0; });
                                            const unique = Array.from(new Set(names));
                                            const nameToVar = new Map((variables || []).map(v => [v.name, v]));
                                            const newVars = unique.map(name => nameToVar.get(name) || ({ id: Helpers.generateId(), name, type: 'text', value: '' }));
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
                        React.createElement('div', { id: "segments-container", className: "space-y-2 flex-1 min-h-0 overflow-y-auto scrollbar-thin" },
                            segments.map((segment, index) => {
                                const showDeletionAbove = (deletionMarkers || []).includes(index);
                                const showDeletionBelow = (deletionMarkers || []).includes(index + 1);
                                return React.createElement(Components.SegmentItem, {
                                    key: segment.id,
                                    segment: segment,
                                    index: index,
                                    onUpdate: updateSegment,
                                    onDelete: deleteSegment,
                                    onAdd: addSegment,
                                    templates: templates.segment || [],
                                    inputHistory: inputHistory.segments || [],
                                    variables: variables,
                                    showDeletionAbove: showDeletionAbove,
                                    showDeletionBelow: showDeletionBelow,
                                    onVariableCommit: (committedText) => {
                                        // 文中の全 {{var}} を抽出し、未登録なら追加
                                        try {
                                            const re = /\{\{\s*([^}\s]+)\s*\}\}/g;
                                            const found = new Set();
                                            let m;
                                            while ((m = re.exec(committedText)) !== null) {
                                                found.add(m[1]);
                                            }
                                            if (found.size > 0) {
                                                const existingNames = new Set(variables.map(v => v.name));
                                                const toAdd = Array.from(found).filter(name => !existingNames.has(name));
                                                if (toAdd.length > 0) {
                                                    setVariables(prev => ([
                                                        ...prev,
                                                        ...toAdd.map(name => ({ id: Helpers.generateId(), name, type: 'text', value: '' }))
                                                    ]));
                                                }
                                            }
                                        } catch (_) {}
                                    },
                                    changeStatus: segmentChangeStatus[index] || null
                                });
                            })
                        ),
                        React.createElement('button', {
                            onClick: () => {
                                setSegments([...segments, { id: Helpers.generateId(), content: '' }]);
                                saveToUndoStack();
                            },
                            className: "w-full mt-3 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                        },
                            React.createElement('svg', { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                                React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 6v6m0 0v6m0-6h6m-6 0H6" })
                            ),
                            '文節を追加'
                        )
                    )
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
                } else {
                    setSegments(prev => ([...prev, ...contents.map(text => ({ id: Helpers.generateId(), content: text }))]));
                }

                setShowTemplateManager(false);
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