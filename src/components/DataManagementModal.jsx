/**
 * データ管理モーダル
 * インポート/エクスポート機能を一元化し、選択肢（全体/ブロック、上書き/マージ）を提供するモーダル
 *
 * 提供機能:
 * - エクスポート: 全体データ or ブロックテンプレートのみ
 * - インポート: JSONファイル選択後、完全上書き or マージ の適用
 *
 * @param {Object} props - プロパティ
 * @param {boolean} props.isOpen - モーダル表示状態
 * @param {Function} props.onClose - モーダルを閉じるコールバック
 * @param {Object} props.currentData - 現在データ { variables, segments, templates, inputHistory }
 * @param {Function} props.onExportAll - 全体エクスポート実行関数
 * @param {Function} props.onExportBlocks - ブロックのみエクスポート実行関数
 * @param {Function} props.onImport - インポート実行関数 ({ file: File, mode: 'overwrite'|'merge' }) => void
 * @returns {JSX.Element|null} モーダル要素（非表示時はnull）
 */
const DataManagementModal = ({ isOpen, onClose, currentData, onExportAll, onExportBlocks, onImport }) => {
  const { useState, useMemo, useCallback } = React;

  const [exportTarget, setExportTarget] = useState('all'); // 'all' | 'blocks'
  const [importMode, setImportMode] = useState('overwrite'); // 'overwrite' | 'merge'
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    if (isOpen) {
      setExportTarget('all');
      setImportMode('overwrite');
      setSelectedFile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = useCallback(() => {
    if (exportTarget === 'blocks') {
      onExportBlocks && onExportBlocks();
    } else {
      onExportAll && onExportAll();
    }
  }, [exportTarget, onExportAll, onExportBlocks]);

  const handleFileChange = useCallback((e) => {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setSelectedFile(f);
  }, []);

  const openFilePicker = useCallback(() => {
    try { fileInputRef.current && fileInputRef.current.click(); } catch (_) {}
  }, []);

  const handleImport = useCallback(() => {
    if (!selectedFile) return;
    onImport && onImport({ file: selectedFile, mode: importMode });
    onClose && onClose();
  }, [selectedFile, importMode, onImport, onClose]);

  return React.createElement('div', {
    className: "fixed inset-0 bg-black/60 flex items-center justify-center z-50",
    onClick: (e) => { if (e.target === e.currentTarget) onClose && onClose(); }
  },
    React.createElement('div', {
      className: "bg-gray-800 rounded-lg w-[min(100vw,720px)] max-w-[92vw] p-6",
      onClick: (e) => e.stopPropagation()
    },
      React.createElement('div', { className: "flex items-center justify-between mb-4" },
        React.createElement('h3', { className: "text-lg font-semibold" }, 'データのインポート/エクスポート'),
        React.createElement('button', { className: "text-gray-300 hover:text-white", onClick: onClose }, '×')
      ),

      React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
        // エクスポート
        React.createElement('div', { className: "space-y-4 border border-gray-700 rounded-md p-4" },
          React.createElement('h4', { className: "font-semibold" }, 'エクスポート'),
          React.createElement('div', { className: "space-y-2" },
            React.createElement('label', { className: "flex items-center gap-2" },
              React.createElement('input', {
                type: 'radio', name: 'exportTarget', checked: exportTarget === 'all', onChange: () => setExportTarget('all')
              }),
              React.createElement('span', null, '全体（変数・セグメント・テンプレート・入力履歴）')
            ),
            React.createElement('label', { className: "flex items-center gap-2" },
              React.createElement('input', {
                type: 'radio', name: 'exportTarget', checked: exportTarget === 'blocks', onChange: () => setExportTarget('blocks')
              }),
              React.createElement('span', null, 'ブロックテンプレートのみ')
            )
          ),
          React.createElement('div', { className: "flex justify-end" },
            React.createElement('button', {
              onClick: handleExport,
              className: "px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700"
            }, 'エクスポート実行')
          )
        ),

        // インポート
        React.createElement('div', { className: "space-y-4 border border-gray-700 rounded-md p-4" },
          React.createElement('h4', { className: "font-semibold" }, 'インポート'),
          React.createElement('div', { className: "space-y-2" },
            React.createElement('div', { className: "flex items-center gap-3" },
              React.createElement('button', {
                onClick: openFilePicker,
                className: "px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md border border-gray-600 text-sm"
              }, 'ファイルを選択'),
              React.createElement('span', { className: "text-sm text-gray-300 truncate" }, selectedFile ? selectedFile.name : 'ファイル未選択')
            ),
            React.createElement('input', {
              ref: fileInputRef,
              type: 'file', accept: '.json,application/json', onChange: handleFileChange, className: "hidden"
            }),
            React.createElement('label', { className: "flex items-center gap-2 mt-2" },
              React.createElement('input', {
                type: 'radio', name: 'importMode', checked: importMode === 'overwrite', onChange: () => setImportMode('overwrite')
              }),
              React.createElement('span', null, '完全に上書き')
            ),
            React.createElement('label', { className: "flex items-center gap-2" },
              React.createElement('input', {
                type: 'radio', name: 'importMode', checked: importMode === 'merge', onChange: () => setImportMode('merge')
              }),
              React.createElement('span', null, 'マージ（既存と統合）')
            ),
            React.createElement('div', { className: "text-xs text-gray-400" },
              'ヒント: ブロックのみを含むファイルをインポートした場合、上書きはブロックのみを対象にします。マージは同名ブロックを置換、それ以外は追加されます。'
            )
          ),
          React.createElement('div', { className: "flex justify-end" },
            React.createElement('button', {
              onClick: handleImport,
              disabled: !selectedFile,
              className: "px-4 py-2 bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
            }, 'インポート適用')
          )
        )
      )
    )
  );
};

// グローバル公開
window.Components = window.Components || {};
window.Components.DataManagementModal = DataManagementModal;


