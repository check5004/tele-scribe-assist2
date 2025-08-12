/**
 * 変数編集モーダルコンポーネント
 * 既存の変数に対して「名前」および「タイプ（text/time/phone）」の編集を行い、
 * 適用時に親コンポーネントへ変更内容をコールバックするモーダル。
 *
 * 仕様:
 * - 「適用」クリックで `onApply(updated)` を呼び出す。
 * - 名前の重複は不可（同一IDの変数を除く）。重複時はエラーメッセージを表示し適用を無効化。
 * - 名前未入力時も適用を無効化。
 * - タイプは text / time / phone から選択。
 *
 * 注意:
 * - 文節中の `{{旧名}}` → `{{新名}}` の一括置換や、プレビュー再生成は親側（App.jsx）で実行する。
 * - time タイプに切り替えた際のフォーマット・丸め設定の付与も親側で行う。
 *
 * @param {Object} props - プロパティ
 * @param {boolean} props.isOpen - モーダルの開閉状態
 * @param {Function} props.onClose - モーダルを閉じるコールバック
 * @param {Object} props.variable - 編集対象の変数
 * @param {Array} props.variables - 既存の全変数（重複チェック用）
 * @param {Function} props.onApply - 変更適用コールバック (updatedVar: {id, name, type}) => void
 * @returns {JSX.Element|null} 変数編集モーダルのJSX
 */
const VariableEditModal = ({ isOpen, onClose, variable, variables, onApply }) => {
  const { useMemo, useState, useEffect, useCallback } = React;

  if (!isOpen || !variable) return null;

  // ローカル編集状態
  const [name, setName] = useState(variable.name || '');
  const [type, setType] = useState(variable.type || 'text');
  const [error, setError] = useState('');

  /**
   * 入力検証: 重複名/空文字
   * @returns {void}
   */
  const validate = useCallback(() => {
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      setError('変数名を入力してください');
      return;
    }
    const exists = (variables || []).some(v => v.name === trimmed && v.id !== variable.id);
    if (exists) {
      setError(`同名の変数「${trimmed}」が既に存在します`);
      return;
    }
    setError('');
  }, [name, variables, variable]);

  useEffect(() => { validate(); }, [name, validate]);

  /**
   * 適用
   * @returns {void}
   */
  const handleApply = useCallback(() => {
    validate();
    if (error) return;
    const trimmed = String(name || '').trim();
    onApply && onApply({ id: variable.id, name: trimmed, type });
  }, [validate, error, name, type, onApply, variable]);

  return React.createElement('div', { className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50' },
    React.createElement('div', { className: 'bg-gray-800 rounded-lg p-6 w-96' },
      React.createElement('h3', { className: 'text-xl font-semibold mb-4' }, '変数を編集'),
      React.createElement('div', { className: 'mb-4' },
        React.createElement('label', { className: 'block text-sm font-medium mb-2' }, '変数名'),
        React.createElement('input', {
          type: 'text',
          value: name,
          onChange: (e) => setName(e.target.value),
          className: 'w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
          placeholder: '例: 相手先名'
        }),
        error && React.createElement('div', { className: 'mt-2 text-sm text-red-400' }, error)
      ),
      React.createElement('div', { className: 'mb-4' },
        React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'タイプ'),
        React.createElement('select', {
          value: type,
          onChange: (e) => setType(e.target.value),
          className: 'w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
        },
          React.createElement('option', { value: 'text' }, 'テキスト'),
          React.createElement('option', { value: 'time' }, '時刻'),
          React.createElement('option', { value: 'phone' }, '電話番号')
        )
      ),
      React.createElement('p', { className: 'text-xs text-gray-400 mb-4' }, '適用時に文節内の {{旧名}} は {{新名}} へ自動置換されます。'),
      React.createElement('div', { className: 'flex justify-end gap-2' },
        React.createElement('button', {
          onClick: onClose,
          className: 'px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors'
        }, 'キャンセル'),
        React.createElement('button', {
          onClick: handleApply,
          disabled: !!error || !String(name || '').trim(),
          className: 'px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50'
        }, '適用')
      )
    )
  );
};

// グローバル公開
window.Components = window.Components || {};
window.Components.VariableEditModal = VariableEditModal;


