/**
 * 文節リストパネルコンポーネント
 * セグメントの一覧表示、編集・削除・追加、削除マーカーの表示を提供
 *
 * @param {Object} props - プロパティ
 * @param {Array} props.segments - セグメント配列
 * @param {Array} props.deletionMarkers - 削除マーカー位置配列
 * @param {Array} props.templates - セグメントテンプレート配列
 * @param {Object} props.inputHistory - 入力履歴
 * @param {Array} props.variables - 変数配列
 * @param {Function} props.onUpdate - セグメント更新 (index:number, content:string) => void
 * @param {Function} props.onDelete - セグメント削除 (index:number) => void
 * @param {Function} props.onAdd - セグメント追加 (index:number) => void
 * @param {Function} props.onCommitVariables - 変数コミット時コールバック (text:string) => void
 * @param {Array} props.changeStatus - 各行の変更状態配列 'new'|'edited'|null
 * @param {Function} props.onAddLineButton - 末尾追加ボタン押下ハンドラ () => void
 * @returns {JSX.Element} 文節パネルのJSX
 */
const SegmentsPane = React.memo(({
  segments,
  deletionMarkers,
  templates,
  inputHistory,
  variables,
  onUpdate,
  onDelete,
  onAdd,
  onCommitVariables,
  changeStatus,
  onAddLineButton
}) => {
  return React.createElement(React.Fragment, null,
    React.createElement('div', { id: "segments-container", className: "space-y-2 lg:flex-1 lg:min-h-0 lg:overflow-y-auto overflow-visible scrollbar-thin" },
      segments.map((segment, index) => {
        const showDeletionAbove = (deletionMarkers || []).includes(index);
        const showDeletionBelow = (deletionMarkers || []).includes(index + 1);
        return React.createElement(Components.SegmentItem, {
          key: segment.id,
          segment: segment,
          index: index,
          onUpdate: onUpdate,
          onDelete: onDelete,
          onAdd: onAdd,
          templates: templates || [],
          inputHistory: (inputHistory && inputHistory.segments) || [],
          variables: variables,
          showDeletionAbove: showDeletionAbove,
          showDeletionBelow: showDeletionBelow,
          onVariableCommit: onCommitVariables,
          changeStatus: (changeStatus && changeStatus[index]) || null
        });
      })
    ),
    React.createElement('button', {
      onClick: onAddLineButton,
      className: "w-full mt-3 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2",
      tabIndex: -1
    },
      React.createElement('svg', { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 6v6m0 0v6m0-6h6m-6 0H6" })
      ),
      '文節を追加'
    )
  );
});

SegmentsPane.displayName = 'SegmentsPane';

// グローバル公開
window.Components = window.Components || {};
window.Components.SegmentsPane = SegmentsPane;


