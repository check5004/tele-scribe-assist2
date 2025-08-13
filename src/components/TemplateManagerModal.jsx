/**
 * テンプレート管理モーダルコンポーネント
 * 文節テンプレートおよびブロックテンプレートの作成・編集・削除・適用を行うUIを提供
 *
 * 主な機能:
 * - 文節テンプレート: 追加/編集/削除
 * - ブロックテンプレート: 追加/編集/削除/適用
 * - 適用モード: 末尾に追加/全置換
 *
 * @param {Object} props - プロパティ
 * @param {Object} props.templates - テンプレートデータ { segment: string[], block: {name: string, segments: string[]}[] }
 * @param {Function} props.setTemplates - テンプレート状態更新関数
 * @param {boolean} props.isOpen - モーダル表示状態
 * @param {Function} props.onClose - モーダルを閉じるコールバック
 * @param {Function} props.onApplyBlock - ブロックテンプレート適用関数 (blockObj, mode: 'append'|'replace')
 * @returns {JSX.Element|null} モーダル要素（非表示時はnull）
 */
const TemplateManagerModal = ({ templates, setTemplates, isOpen, onClose, onApplyBlock }) => {
    const { useState, useMemo, useCallback } = React;

    // タブ状態: 'segment' | 'block'
    const [activeTab, setActiveTab] = useState('segment');

    // 文節テンプレート編集用ローカル状態
    const [segmentDrafts, setSegmentDrafts] = useState(() => templates?.segment || []);
    const [newSegmentText, setNewSegmentText] = useState('');

    // ブロックテンプレート編集用ローカル状態
    const [blockDrafts, setBlockDrafts] = useState(() => (templates?.block || []).map(b => ({ ...b })));
    const [newBlockName, setNewBlockName] = useState('');
    const [newBlockSegments, setNewBlockSegments] = useState(''); // 改行区切り

    // 外部のtemplatesが変わった場合に初期ロード（初回表示やインポート直後など）
    React.useEffect(() => {
        setSegmentDrafts(templates?.segment || []);
        setBlockDrafts((templates?.block || []).map(b => ({ ...b })));
    }, [templates]);

    /**
     * 文節テンプレートの保存処理
     * ローカルドラフトからテンプレート状態を更新
     */
    const saveSegmentTemplates = useCallback(() => {
        const cleaned = segmentDrafts
            .map(s => (s || '').trim())
            .filter(s => s.length > 0);
        setTemplates({
            ...templates,
            segment: cleaned
        });
    }, [segmentDrafts, setTemplates, templates]);

    /**
     * ブロックテンプレートの保存処理
     * ローカルドラフトからテンプレート状態を更新
     */
    const saveBlockTemplates = useCallback(() => {
        // 空行を保持する仕様: trim/remove を行わず、配列化のみ
        const cleaned = blockDrafts
            .map(b => ({
                name: (b.name || '').trim() || '無題ブロック',
                segments: Array.isArray(b.segments)
                    ? b.segments.map(s => String(s ?? ''))
                    : String(b.segments ?? '').split('\n')
            }))
            // 名前のみ必須、segmentsは空行含めて保持
            .filter(b => b.name.length > 0);

        setTemplates({
            ...templates,
            block: cleaned
        });
    }, [blockDrafts, setTemplates, templates]);

    // 追加系ハンドラ
    const addSegmentTemplate = useCallback(() => {
        if (!newSegmentText.trim()) return;
        setSegmentDrafts(prev => [...prev, newSegmentText.trim()]);
        setNewSegmentText('');
    }, [newSegmentText]);

    const removeSegmentTemplate = useCallback((idx) => {
        setSegmentDrafts(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const updateSegmentTemplate = useCallback((idx, value) => {
        setSegmentDrafts(prev => {
            const next = [...prev];
            next[idx] = value;
            return next;
        });
    }, []);

    const addBlockTemplate = useCallback(() => {
        const name = newBlockName.trim() || '新規ブロック';
        const segs = newBlockSegments.split('\n').map(s => s.trim()).filter(Boolean);
        if (segs.length === 0) return;
        setBlockDrafts(prev => [...prev, { name, segments: segs }]);
        setNewBlockName('');
        setNewBlockSegments('');
    }, [newBlockName, newBlockSegments]);

    const removeBlockTemplate = useCallback((idx) => {
        setBlockDrafts(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const updateBlockName = useCallback((idx, name) => {
        setBlockDrafts(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], name };
            return next;
        });
    }, []);

    const updateBlockSegments = useCallback((idx, textAreaValue) => {
        const list = String(textAreaValue || '').split('\n');
        setBlockDrafts(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], segments: list };
            return next;
        });
    }, []);

    if (!isOpen) return null;

    return React.createElement('div', {
        className: "fixed inset-0 bg-black/60 flex items-center justify-center z-50",
        onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
    },
        React.createElement('div', {
            className: "bg-gray-800 rounded-lg w-[min(100vw,900px)] max-w-[90vw] max-h-[85vh] overflow-auto scrollbar-thin",
            onClick: (e) => e.stopPropagation()
        },
            // ヘッダー
            React.createElement('div', { className: "flex items-center justify-between px-5 py-3 border-b border-gray-700" },
                React.createElement('h3', { className: "text-xl font-semibold" }, 'テンプレート管理'),
                React.createElement('button', { className: "text-gray-300 hover:text-white", onClick: onClose }, '×')
            ),

            // タブ
            React.createElement('div', { className: "px-5 pt-3" },
                React.createElement('div', { className: "inline-flex bg-gray-700 rounded-lg p-1" },
                    React.createElement('button', {
                        className: `px-4 py-2 rounded-md ${activeTab === 'segment' ? 'bg-blue-600' : 'hover:bg-gray-600'}`,
                        onClick: () => setActiveTab('segment')
                    }, '文節テンプレート'),
                    React.createElement('button', {
                        className: `px-4 py-2 rounded-md ${activeTab === 'block' ? 'bg-blue-600' : 'hover:bg-gray-600'}`,
                        onClick: () => setActiveTab('block')
                    }, 'ブロックテンプレート')
                )
            ),

            // 本体
            React.createElement('div', { className: "p-5 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin pr-2" },
                // 文節テンプレートタブ
                activeTab === 'segment' && React.createElement('div', { className: "space-y-4" },
                    React.createElement('div', { className: "flex gap-2" },
                        React.createElement('input', {
                            type: 'text',
                            value: newSegmentText,
                            onChange: (e) => setNewSegmentText(e.target.value),
                            placeholder: '文節テンプレートを入力（{{}}で変数）',
                            title: 'ヒント: {{変数名}} と書くと変数が自動作成・参照されます。{{ の直後に候補が表示されます。',
                            className: "flex-1 px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        }),
                        React.createElement('button', {
                            onClick: addSegmentTemplate,
                            className: "px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700"
                        }, '追加')
                    ),
                    React.createElement('div', { className: "text-xs text-gray-400 flex items-center gap-2" },
                        React.createElement('svg', { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                            React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M12 6a9 9 0 110 12 9 9 0 010-12z" })
                        ),
                        'ヒント: {{変数名}} と書くと変数が自動作成・参照されます。{{ の直後に候補が出ます（↑↓で選択／Enterで確定）。'
                    ),
                    React.createElement('div', { className: "space-y-2" },
                        segmentDrafts.length === 0 && React.createElement('div', { className: "text-gray-400" }, 'テンプレートは未登録です'),
                        segmentDrafts.map((text, idx) => React.createElement('div', { key: idx, className: "flex gap-2 items-center" },
                            React.createElement('input', {
                                type: 'text', value: text,
                                onChange: (e) => updateSegmentTemplate(idx, e.target.value),
                                title: 'ヒント: {{変数名}} で変数。未登録の変数は自動追加されます。',
                                className: "flex-1 px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            }),
                            React.createElement('button', { onClick: () => removeSegmentTemplate(idx), className: "px-3 py-2 bg-red-600 rounded-md hover:bg-red-700" }, '削除')
                        ))
                    ),
                    React.createElement('div', { className: "flex justify-end" },
                        React.createElement('button', {
                            onClick: saveSegmentTemplates,
                            className: "px-4 py-2 bg-green-600 rounded-md hover:bg-green-700"
                        }, '保存')
                    )
                ),

                // ブロックテンプレートタブ
                activeTab === 'block' && React.createElement('div', { className: "space-y-6" },
                    React.createElement('div', { className: "space-y-2" },
                        React.createElement('div', { className: "text-sm text-gray-400" },
                            'ヒント: ブロックは各行が1文節。{{変数名}} で変数を挿入できます。未登録の変数は自動追加されます。'
                        ),
                        React.createElement('input', {
                            type: 'text', value: newBlockName,
                            onChange: (e) => setNewBlockName(e.target.value),
                            placeholder: 'ブロック名',
                            className: "w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        }),
                        React.createElement('textarea', {
                            value: newBlockSegments,
                            onChange: (e) => setNewBlockSegments(e.target.value),
                            placeholder: '各行が1つの文節テンプレート（{{}}で変数）',
                            title: 'ヒント: 各行が1文節。{{変数名}} で変数。未登録は自動追加されます。',
                            className: "w-full h-32 px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        }),
                        React.createElement('div', { className: "flex justify-end" },
                            React.createElement('button', { onClick: addBlockTemplate, className: "px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700" }, 'ブロックを追加')
                        )
                    ),

                    React.createElement('div', { className: "space-y-4" },
                        blockDrafts.length === 0 && React.createElement('div', { className: "text-gray-400" }, 'ブロックテンプレートは未登録です'),
                        blockDrafts.map((block, idx) => React.createElement('div', { key: idx, className: "border border-gray-700 rounded-lg overflow-hidden" },
                            React.createElement('div', { className: "flex items-center justify-between px-3 py-2 bg-gray-700" },
                                React.createElement('input', {
                                    type: 'text', value: block.name,
                                    onChange: (e) => updateBlockName(idx, e.target.value),
                                    className: "flex-1 mr-2 px-3 py-2 bg-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                }),
                                React.createElement('div', { className: "flex items-center gap-2" },
                                    React.createElement('button', {
                                        onClick: () => onApplyBlock && onApplyBlock(block, 'append'),
                                        className: "px-3 py-1 bg-blue-600 rounded-md hover:bg-blue-700",
                                        title: '末尾に追加'
                                    }, '適用(追加)'),
                                    React.createElement('button', {
                                        onClick: async () => {
                                            try {
                                                if (window.__telescribe_hasUnsavedChanges && window.__telescribe_hasUnsavedChanges()) {
                                                    const ok = await window.UI.confirm({ title: '未保存の変更', message: '未保存の変更があります。続行すると変更が失われます。置換を実行しますか？', okText: '置換する' });
                                                    if (!ok) return;
                                                }
                                            } catch (_) {}
                                            onApplyBlock && onApplyBlock(block, 'replace');
                                        },
                                        className: "px-3 py-1 bg-purple-600 rounded-md hover:bg-purple-700",
                                        title: '全置換'
                                    }, '適用(置換)'),
                                    React.createElement('button', { onClick: () => removeBlockTemplate(idx), className: "px-3 py-1 bg-red-600 rounded-md hover:bg-red-700" }, '削除')
                                )
                            ),
                            React.createElement('textarea', {
                                value: Array.isArray(block.segments) ? block.segments.join('\n') : String(block.segments || ''),
                                onChange: (e) => updateBlockSegments(idx, e.target.value),
                                title: 'ヒント: 各行が1文節。{{変数名}} で変数。未登録は自動追加されます。',
                                className: "w-full h-32 px-3 py-2 bg-gray-800 scrollbar-thin"
                            })
                        ))
                    ),

                    React.createElement('div', { className: "flex justify-end" },
                        React.createElement('button', {
                            onClick: saveBlockTemplates,
                            className: "px-4 py-2 bg-green-600 rounded-md hover:bg-green-700"
                        }, '保存')
                    )
                )
            )
        )
    );
};

/**
 * グローバルスコープへの公開
 * モジュラー構成でのコンポーネント参照を可能にする
 */
window.Components = window.Components || {};
window.Components.TemplateManagerModal = TemplateManagerModal;


