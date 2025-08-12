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
 * @param {Function} [props.onCommitValue] - Blur/Chipクリック時の履歴コミット関数 (name,value,'phone')
 * @param {{groupValue?:string, history?:string[]}} [props.suggestions] - 右半分Chip候補
 * @returns {JSX.Element} 入力フィールド
 */
const PhoneInput = React.memo(({ variable, onChange, onCommitValue, suggestions, onSuggestOpen, onSuggestClose }) => {
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
    // 作成中でも都度更新（数字のみ許容）
    const half = toHalfWidthDigits(e.target.value);
    const digitsOnly = half.replace(/\D/g, '');
    onChange({ ...variable, value: digitsOnly });
  }, [variable, onChange, toHalfWidthDigits]);

  const handleBlur = React.useCallback(() => {
    const formatted = Helpers.formatJapanesePhone(variable.value || '');
    onChange({ ...variable, value: formatted });
    try { onCommitValue && onCommitValue(variable.name, formatted, 'phone'); } catch (_) {}
  }, [variable, onChange, onCommitValue]);

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

  const [openSuggest, setOpenSuggest] = React.useState(false);
  const dropdownRef = React.useRef(null);

  return React.createElement('div', { className: 'relative group' },
    React.createElement('input', {
      type: 'text',
      inputMode: 'numeric',
      pattern: '[0-9]*',
      value: String(variable.value || ''),
      onCompositionStart: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd,
      onChange: handleChange,
      onBlur: (e) => { try { handleBlur(e); } catch (_) {} try { setTimeout(() => { setOpenSuggest(false); if (typeof onSuggestClose === 'function') onSuggestClose(); }, 120); } catch (_) {} },
      onFocus: (e) => { try { handleFocus(e); } catch (_) {} try { setOpenSuggest(true); if (typeof onSuggestOpen === 'function') onSuggestOpen(dropdownRef.current); } catch (_) {} },
      className: 'w-full pr-8 px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
      placeholder: `${variable.name}を入力（数字のみ）`
    }),
    // 右半分Chip（グループのみ、入力が空のとき）
    React.createElement('div', { className: 'pointer-events-none absolute inset-y-0 right-10 w-1/2 flex items-center justify-start gap-1 pl-2 z-10 tsa-scroll-x' },
      (() => {
        const chips = [];
        const values = (suggestions && Array.isArray(suggestions.groupValues)) ? suggestions.groupValues : [];
        if (!String(variable.value || '').length && values.length > 0) {
          values.slice(0, 3).forEach((val, idx) => {
            chips.push(React.createElement('button', {
              key: `group${idx}`,
              type: 'button',
              className: 'pointer-events-auto px-2 py-0.5 text-xs bg-transparent border border-emerald-400/60 text-emerald-300 hover:bg-emerald-400/10 rounded',
              title: 'グループ候補を適用',
              'aria-label': `${variable.name}にグループ候補を適用`,
              onMouseDown: (e) => { try { e.preventDefault(); } catch (_) {} },
              onClick: () => {
                const v = String(val ?? '');
                onChange({ ...variable, value: v });
                try { onCommitValue && onCommitValue(variable.name, v, 'phone'); } catch (_) {}
              }
            }, String(val)));
          });
        }
        return chips;
      })()
    ),
    // 下部候補ドロップダウン（通常履歴）
    (() => {
      const history = (suggestions && Array.isArray(suggestions.history)) ? suggestions.history : [];
      const inputValue = String(variable.value || '');
      const max = 5;
      const filtered = (inputValue
        ? history.filter(h => String(h || '').includes(inputValue))
        : history)
        .filter(h => String(h || '') !== inputValue);
      const toShow = filtered.slice(0, max);
      if (!openSuggest || toShow.length === 0) return null;
      return React.createElement('div', {
        ref: dropdownRef,
        className: 'absolute left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-40 max-h-48 overflow-auto'
      }, toShow.map((val, i) => React.createElement('button', {
        key: i,
        type: 'button',
        className: 'w-full text-left px-3 py-2 text-sm hover:bg-gray-700',
        onMouseDown: (e) => { try { e.preventDefault(); } catch (_) {} },
        onClick: () => {
          const v = String(val ?? '');
          onChange({ ...variable, value: v });
          try { onCommitValue && onCommitValue(variable.name, v, 'phone'); } catch (_) {}
          try { setOpenSuggest(false); } catch (_) {}
        }
      }, val)));
    })(),
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


