/**
 * 電話番号入力コンポーネント
 * 日本の電話番号に対応し、入力中は数字のみを許容し、Blur時に自動でハイフンを付与する
 *
 * 仕様:
 * - onChange: 数字以外は除去して値を反映
 * - onBlur: Helpers.formatJapanesePhone でハイフン整形
 * - onFocus: 編集しやすいように数字のみ表示に戻す
 *
 * @param {Object} props - プロパティ
 * @param {Object} props.variable - 変数オブジェクト {id, name, type: 'phone', value}
 * @param {Function} props.onChange - 値変更コールバック (updatedVariable:Object) => void
 * @returns {JSX.Element} 入力フィールド
 */
const PhoneInput = React.memo(({ variable, onChange }) => {
  const isComposingRef = React.useRef(false);

  const toHalfWidthDigits = React.useCallback((value) => {
    return String(value || '').replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
  }, []);

  const handleCompositionStart = React.useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = React.useCallback((e) => {
    isComposingRef.current = false;
    const half = toHalfWidthDigits(e.target.value);
    const digitsOnly = half.replace(/\D/g, '');
    onChange({ ...variable, value: digitsOnly });
  }, [onChange, variable, toHalfWidthDigits]);

  const handleChange = React.useCallback((e) => {
    if (isComposingRef.current) return;
    const half = toHalfWidthDigits(e.target.value);
    const digitsOnly = half.replace(/\D/g, '');
    onChange({ ...variable, value: digitsOnly });
  }, [variable, onChange, toHalfWidthDigits]);

  const handleBlur = React.useCallback(() => {
    const formatted = Helpers.formatJapanesePhone(variable.value || '');
    onChange({ ...variable, value: formatted });
  }, [variable, onChange]);

  const handleFocus = React.useCallback(() => {
    // 入力時は数字のみを保持（valueはstate反映で既に数字のみ）
  }, []);

  /**
   * クリアボタンクリックハンドラ
   * 入力フィールド右端のゴミ箱アイコン押下で値を空文字にする。
   * @returns {void}
   */
  const handleClearClick = React.useCallback(() => {
    onChange({ ...variable, value: '' });
  }, [variable, onChange]);

  return React.createElement('div', { className: 'relative group' },
    React.createElement('input', {
      type: 'text',
      inputMode: 'numeric',
      pattern: '[0-9]*',
      value: String(variable.value || ''),
      onCompositionStart: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd,
      onChange: handleChange,
      onBlur: handleBlur,
      onFocus: handleFocus,
      className: 'w-full pr-8 px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
      placeholder: `${variable.name}を入力（数字のみ）`
    }),
    React.createElement('button', {
      type: 'button',
      tabIndex: -1,
      title: '入力内容をクリア',
      'aria-label': '入力内容をクリア',
      onMouseDown: (e) => { try { e.preventDefault(); } catch (_) {} },
      onClick: handleClearClick,
      className: 'absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity'
    },
      React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' })
      )
    )
  );
});

PhoneInput.displayName = 'PhoneInput';

// グローバル公開
window.Components = window.Components || {};
window.Components.PhoneInput = PhoneInput;


