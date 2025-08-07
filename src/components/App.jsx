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
    const { useState, useEffect, useCallback } = React;

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
    const [templates, setTemplates] = useState(
        initialData?.templates || Constants.SAMPLE_TEMPLATES
    );
    const [inputHistory, setInputHistory] = useState(
        initialData?.inputHistory || Constants.INITIAL_INPUT_HISTORY
    );

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
     */
    useEffect(() => {
        let text = segments.map(segment => {
            let content = segment.content;
            variables.forEach(variable => {
                const regex = new RegExp(`{{${variable.name}}}`, 'g');
                content = content.replace(regex, variable.value || `{{${variable.name}}}`);
            });
            return content;
        }).join('\n');
        setPreview(text);
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

    return React.createElement('div', { className: "min-h-screen bg-gray-900 text-gray-100 flex flex-col" },
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

        React.createElement('div', { className: "flex flex-1 overflow-hidden" },
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
                    )
                )
            ),

            // メインコンテンツ
            React.createElement('div', { className: "flex-1 flex gap-4 p-4 overflow-hidden" },
                // 左パネル
                React.createElement('div', { className: "flex-1 flex flex-col gap-4 min-w-0" },
                    // プレビューセクション
                    React.createElement('div', { className: "bg-gray-800 rounded-lg shadow-xl overflow-hidden" },
                        React.createElement('div', { className: "gradient-accent p-3" },
                            React.createElement('h2', { className: "text-lg font-semibold" }, 'プレビュー')
                        ),
                        React.createElement('div', { className: "p-4" },
                            React.createElement('textarea', {
                                value: preview,
                                onChange: (e) => {
                                    const lines = e.target.value.split('\n');
                                    const newSegments = lines.map((line, i) => ({
                                        id: segments[i]?.id || Helpers.generateId(),
                                        content: line
                                    }));
                                    setSegments(newSegments);
                                },
                                className: "w-full h-48 px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 scrollbar-thin resize-none",
                                placeholder: "ここに報告文が表示されます..."
                            }),
                            React.createElement('div', { className: "flex gap-2 mt-3" },
                                React.createElement('button', {
                                    onClick: () => copyToClipboard('plain'),
                                    className: "flex-1 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                }, '全体コピー'),
                                React.createElement('select', {
                                    onChange: (e) => copyToClipboard(e.target.value),
                                    className: "px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                },
                                    React.createElement('option', { value: "" }, '形式選択'),
                                    React.createElement('option', { value: "plain" }, 'プレーンテキスト'),
                                    React.createElement('option', { value: "markdown" }, 'Markdown'),
                                    React.createElement('option', { value: "html" }, 'HTML')
                                )
                            )
                        )
                    ),

                    // 基本情報セクション
                    React.createElement('div', { className: "bg-gray-800 rounded-lg shadow-xl overflow-hidden" },
                        React.createElement('div', { className: "gradient-accent p-3" },
                            React.createElement('h2', { className: "text-lg font-semibold" }, '基本情報（変数）')
                        ),
                        React.createElement('div', { className: "p-4" },
                            React.createElement('div', { className: "space-y-3 max-h-64 overflow-y-auto scrollbar-thin px-2" },
                                variables.map((variable, index) =>
                                    React.createElement('div', { key: variable.id, className: "space-y-2" },
                                        React.createElement('div', { className: "flex items-center justify-between" },
                                            React.createElement('label', { className: "text-sm font-medium" }, variable.name),
                                            React.createElement('button', {
                                                onClick: () => {
                                                    setVariables(variables.filter(v => v.id !== variable.id));
                                                    saveToUndoStack();
                                                },
                                                className: "text-red-400 hover:text-red-300"
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
                            ),
                            React.createElement('button', {
                                onClick: () => setShowVariableModal(true),
                                className: "w-full mt-3 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                            },
                                React.createElement('svg', { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                                    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 6v6m0 0v6m0-6h6m-6 0H6" })
                                ),
                                '変数を追加'
                            )
                        )
                    )
                ),

                // 右パネル
                React.createElement('div', { className: "flex-1 bg-gray-800 rounded-lg shadow-xl overflow-hidden" },
                    React.createElement('div', { className: "gradient-accent p-3" },
                        React.createElement('h2', { className: "text-lg font-semibold" }, '報告文の組み立て（文節）')
                    ),
                    React.createElement('div', { className: "p-4" },
                        React.createElement('div', { id: "segments-container", className: "space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin" },
                            segments.map((segment, index) =>
                                React.createElement(Components.SegmentItem, {
                                    key: segment.id,
                                    segment: segment,
                                    index: index,
                                    onUpdate: updateSegment,
                                    onDelete: deleteSegment,
                                    onAdd: addSegment
                                })
                            )
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

        // モーダル
        showVariableModal && React.createElement(Components.VariableModal, {
            variables: variables,
            setVariables: setVariables,
            setShowVariableModal: setShowVariableModal,
            saveToUndoStack: saveToUndoStack
        })
    );
}

/**
 * グローバルスコープへの公開
 * モジュラー構成でのコンポーネント参照を可能にする
 */
window.Components = window.Components || {};
window.Components.App = App;