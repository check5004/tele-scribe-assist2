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

  return React.createElement('input', {
    type: 'text',
    inputMode: 'numeric',
    pattern: '[0-9]*',
    value: String(variable.value || ''),
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onChange: handleChange,
    onBlur: handleBlur,
    onFocus: handleFocus,
    className: 'w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
    placeholder: `${variable.name}を入力（数字のみ）`
  });
});

PhoneInput.displayName = 'PhoneInput';

// グローバル公開
window.Components = window.Components || {};
window.Components.PhoneInput = PhoneInput;


