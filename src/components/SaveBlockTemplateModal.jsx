/**
 * ブロックテンプレート保存モーダル
 * 現在の文節構成（segments）を新規ブロックテンプレートとして保存するためのモーダル
 *
 * 主な機能:
 * - ブロック名の入力（新規保存時のみ）
 * - 上書き保存（対象ブロック選択/既定は選択中ブロック）
 * - 保存/キャンセル
 *
 * @param {Object} props - プロパティ
 * @param {boolean} props.isOpen - モーダル表示状態
 * @param {Function} props.onClose - モーダルを閉じるコールバック
 * @param {Function} props.onSave - 保存実行コールバック ({ name: string, mode: 'new'|'overwrite', overwriteIndex?: number }) => void
 * @param {Array} [props.existingBlocks] - 既存ブロック一覧（上書き対象選択用）
 * @param {('new'|'overwrite')} [props.defaultMode] - デフォルト保存モード
 * @param {number} [props.defaultOverwriteIndex] - デフォルト上書き対象インデックス
 * @returns {JSX.Element|null} モーダル要素（非表示時はnull）
 */
const SaveBlockTemplateModal = ({ isOpen, onClose, onSave, existingBlocks = [], defaultMode = 'new', defaultOverwriteIndex = -1 }) => {
    const { useState, useEffect } = React;

    /**
     * デフォルト名の生成
     * 現在時刻を含む一意性の高いブロック名を初期値として設定
     * @returns {string} デフォルトのブロック名
     */
    const generateDefaultName = () => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `ブロック ${yyyy}-${mm}-${dd} ${hh}:${mi}`;
    };

    const [blockName, setBlockName] = useState(generateDefaultName());
    const [mode, setMode] = useState(defaultMode);
    const [overwriteIndex, setOverwriteIndex] = useState(defaultOverwriteIndex);

    useEffect(() => {
        if (isOpen) {
            setBlockName(generateDefaultName());
            setMode(defaultMode);
            setOverwriteIndex(defaultOverwriteIndex ?? -1);
        }
    }, [isOpen, defaultMode, defaultOverwriteIndex]);

    if (!isOpen) return null;

    return React.createElement('div', {
        className: "fixed inset-0 bg-black/60 flex items-center justify-center z-50",
        onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
    },
        React.createElement('div', {
            className: "bg-gray-800 rounded-lg w-[min(100vw,520px)] max-w-[90vw] p-6",
            onClick: (e) => e.stopPropagation()
        },
            React.createElement('div', { className: "flex items-center justify-between mb-4" },
                React.createElement('h3', { className: "text-lg font-semibold" }, '現在内容をブロック保存'),
                React.createElement('button', { className: "text-gray-300 hover:text-white", onClick: onClose }, '×')
            ),
            React.createElement('div', { className: "space-y-4" },
                React.createElement('div', { className: "flex items-center gap-4" },
                    React.createElement('label', { className: "flex items-center gap-2" },
                        React.createElement('input', {
                            type: 'radio',
                            name: 'saveMode',
                            checked: mode === 'new',
                            onChange: () => setMode('new')
                        }),
                        React.createElement('span', null, '新規として保存')
                    ),
                    React.createElement('label', { className: "flex items-center gap-2" },
                        React.createElement('input', {
                            type: 'radio',
                            name: 'saveMode',
                            checked: mode === 'overwrite',
                            onChange: () => setMode('overwrite')
                        }),
                        React.createElement('span', null, '既存ブロックに上書き')
                    )
                ),
                mode === 'overwrite' && React.createElement('div', { className: "space-y-2" },
                    React.createElement('label', { className: "block text-sm mb-1" }, '上書き対象のブロック'),
                    React.createElement('select', {
                        value: overwriteIndex,
                        onChange: (e) => setOverwriteIndex(Number(e.target.value)),
                        className: "w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    },
                        React.createElement('option', { value: -1 }, '選択してください'),
                        existingBlocks.map((b, i) => React.createElement('option', { key: i, value: i }, b.name || `ブロック${i + 1}`))
                    )
                ),
                mode === 'new' && React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm mb-2" }, 'ブロック名'),
                    React.createElement('input', {
                        type: 'text',
                        value: blockName,
                        onChange: (e) => setBlockName(e.target.value),
                        className: "w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    })
                ),
                // 空行は常に含める仕様に変更（UIなし）
            ),
            React.createElement('div', { className: "flex justify-end gap-2 mt-6" },
                React.createElement('button', { onClick: onClose, className: "px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600" }, 'キャンセル'),
                React.createElement('button', {
                    onClick: () => onSave && onSave({ name: blockName.trim(), mode, overwriteIndex }),
                    disabled: !blockName.trim() || (mode === 'overwrite' && overwriteIndex < 0),
                    className: "px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                }, '保存')
            )
        )
    );
};

/**
 * グローバルスコープへの公開
 * モジュラー構成でのコンポーネント参照を可能にする
 */
window.Components = window.Components || {};
window.Components.SaveBlockTemplateModal = SaveBlockTemplateModal;


