/**
 * 変数一覧パネルコンポーネント
 * 各変数の表示、未使用ハイライト、削除、編集、コピー（`{{変数名}}`）を提供
 *
 * @param {Object} props - プロパティ
 * @param {Array} props.variables - 変数配列
 * @param {Object} props.variableUsageInfo - 使用状況情報 {unusedVariables: string[], usedVariables: string[], variableUsage: object}
 * @param {Function} props.onUpdate - 変数更新 (index:number, updatedVar:Object) => void
 * @param {Function} props.onDelete - 変数削除 (variableId:string) => void
 * @param {Function} props.onEdit - 変数編集モーダル表示 (variableId:string) => void
 * @param {Function} props.onAddClick - 追加ボタン押下ハンドラ () => void
 * @param {Function} [props.showToast] - トースト表示関数 (message:string, durationMs?:number) => void
 * @param {Function} [props.onCommitValue] - 値コミット関数 (name:string, value:string, type:string) => void
 * @param {Object} [props.suggestions] - 変数名→候補 { [name]: { groupValues?:string[], history?:string[] } }
 * @returns {JSX.Element} 変数一覧パネルのJSX
 */
const VariablesPanel = React.memo(({ variables, variableUsageInfo, onUpdate, onDelete, onEdit, onAddClick, showToast, onCommitValue, suggestions }) => {
  /**
   * 変数表示順計算関数
   * 文節セクションでの「出現順」に基づき使用中の変数を並べ、未使用の変数は追加順（元配列順）で末尾に配置する。
   *
   * 並び替えルール:
   * - 使用中: 最初に出現した文節のインデックス昇順
   * - 同一文節内: テキスト内での `{{ 変数名 }}` の先頭位置（index）昇順
   * - 同点時: 元の追加順（元配列インデックス）昇順
   * - 未使用: 元の追加順で末尾に連結
   *
   * 実装詳細:
   * - `variableUsageInfo.variableUsage[id].usedInSegments` に含まれる `segmentIndex` と `content` を用いて、
   *   各変数の初出位置（最も小さい `segmentIndex` と、その行での `{{name}}` の開始位置）を算出する。
   * - `{{ name }}` の検出は、前後の空白を許容する `/\{\{\s*name\s*\}\}/` で検索し、見つからない場合に厳密一致 `{{name}}` で補完。
   *
   * @param {Array} variables - 変数配列
   * @param {Object} variableUsageInfo - 使用状況情報
   * @returns {Array<{variable:Object, originalIndex:number}>} 表示順に並んだ項目配列
   */
  const computeVariablesDisplayOrder = (variables, variableUsageInfo) => {
    const items = Array.isArray(variables) ? variables : [];
    const usage = (variableUsageInfo && variableUsageInfo.variableUsage) ? variableUsageInfo.variableUsage : {};

    const escapeRegExp = (s) => {
      try {
        if (window.Helpers && typeof window.Helpers.escapeRegExp === 'function') {
          return window.Helpers.escapeRegExp(String(s ?? ''));
        }
      } catch (_) {}
      return String(s ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    /**
     * 指定変数がテキスト中に現れる最初の位置を返す（空白許容）。
     * 見つからない場合は Number.POSITIVE_INFINITY を返す。
     * @param {string} text - 行テキスト
     * @param {string} varName - 変数名
     * @returns {number} 先頭位置インデックスまたは Infinity
     */
    const findFirstVarRefPosition = (text, varName) => {
      try {
        const relaxed = new RegExp(`\\{\\{\\s*${escapeRegExp(varName)}\\s*\\}}`);
        const idx = String(text ?? '').search(relaxed);
        if (idx >= 0) return idx;
      } catch (_) {}
      const strict = `{{${String(varName ?? '')}}}`;
      const idx2 = String(text ?? '').indexOf(strict);
      return idx2 >= 0 ? idx2 : Number.POSITIVE_INFINITY;
    };

    const used = [];
    const unused = [];

    for (let i = 0; i < items.length; i++) {
      const v = items[i];
      const u = usage && usage[v.id];
      if (u && u.isUsed && Array.isArray(u.usedInSegments) && u.usedInSegments.length > 0) {
        // 初出（最小segmentIndex、かつその行での位置）を求める
        let firstSeg = Number.POSITIVE_INFINITY;
        let firstPos = Number.POSITIVE_INFINITY;
        for (const occ of u.usedInSegments) {
          const segIdx = typeof occ.segmentIndex === 'number' ? occ.segmentIndex : Number.POSITIVE_INFINITY;
          const pos = findFirstVarRefPosition(occ && occ.content, v.name);
          if (
            segIdx < firstSeg ||
            (segIdx === firstSeg && pos < firstPos)
          ) {
            firstSeg = segIdx;
            firstPos = pos;
          }
        }
        used.push({ variable: v, originalIndex: i, firstSegmentIndex: firstSeg, firstPosition: firstPos });
      } else {
        unused.push({ variable: v, originalIndex: i });
      }
    }

    used.sort((a, b) => (
      (a.firstSegmentIndex - b.firstSegmentIndex) ||
      (a.firstPosition - b.firstPosition) ||
      (a.originalIndex - b.originalIndex)
    ));

    // 未使用は元の追加順のまま
    unused.sort((a, b) => a.originalIndex - b.originalIndex);

    return [...used, ...unused];
  };

  /**
   * 表示用に並び替えた変数リスト
   * 依存する `variables` と `variableUsageInfo` が変化したときのみ再計算する
   */
  const orderedItems = React.useMemo(() => (
    computeVariablesDisplayOrder(variables, variableUsageInfo)
  ), [variables, variableUsageInfo]);

  /**
   * 変数コピー処理
   * 指定された変数名から `{{変数名}}` 形式の文字列を生成し、クリップボードへコピーした後、トーストで明示表示する
   *
   * @param {string} variableName - 対象の変数名
   * @returns {void}
   */
  const handleCopyVariable = React.useCallback((variableName) => {
    const text = `{{${String(variableName || '').trim()}}}`;
    try {
      if (window.DataService && typeof window.DataService.copyToClipboard === 'function') {
        window.DataService.copyToClipboard(text, 'plain');
      } else if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text);
      }
    } catch (_) {
      try { navigator.clipboard.writeText(text); } catch (__) {}
    }
    try { if (typeof showToast === 'function') showToast(`コピーしました: ${text}`); } catch (_) {}
  }, [showToast]);
  const scrollRef = React.useRef(null);
  const [extraBottomSpace, setExtraBottomSpace] = React.useState(0);

  const handleSuggestOpen = React.useCallback((dropdownEl) => {
    try {
      const sc = scrollRef.current;
      if (!sc || !dropdownEl) return;
      const scRect = sc.getBoundingClientRect();
      const ddRect = dropdownEl.getBoundingClientRect();
      const overflow = Math.ceil(ddRect.bottom - scRect.bottom);
      if (overflow > 0) {
        const extra = overflow + 12;
        setExtraBottomSpace(extra);
        try { sc.scrollBy({ top: extra, behavior: 'smooth' }); } catch (_) { sc.scrollTop += extra; }
      } else {
        setExtraBottomSpace(0);
      }
    } catch (_) {}
  }, []);

  const handleSuggestClose = React.useCallback(() => {
    setExtraBottomSpace(0);
  }, []);

  return React.createElement('div', { className: "bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col lg:flex-1 lg:min-h-0" },
    React.createElement('div', { className: "gradient-accent p-3 flex-none" },
      React.createElement('div', { className: "flex items-center justify-between gap-3" },
        React.createElement('h2', { className: "text-lg font-semibold" }, '基本情報（変数）'),
        React.createElement('button', {
          onClick: onAddClick,
          className: "px-3 py-1.5 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2",
          tabIndex: -1,
          title: "変数を追加"
        },
          React.createElement('svg', { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
            React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 6v6m0 0v6m0-6h6m-6 0H6" })
          ),
          '変数を追加'
        )
      )
    ),
    React.createElement('div', { className: "p-4 flex flex-col lg:flex-1 lg:min-h-0" },
      React.createElement('div', { ref: scrollRef, className: "space-y-3 lg:flex-1 lg:min-h-0 overflow-y-auto scrollbar-thin px-2", style: { maxHeight: '70vh' } },
        orderedItems.map(({ variable, originalIndex }) => (
          React.createElement('div', { key: variable.id, className: "space-y-2" },
            React.createElement('div', { className: "flex items-center justify-between" },
              React.createElement('div', { className: "flex items-center gap-2" },
                React.createElement('label', {
                  className: `text-sm font-medium ${variableUsageInfo.unusedVariables.includes(variable.id) ? 'text-yellow-400 opacity-70' : 'text-gray-100'}`,
                  title: variableUsageInfo.unusedVariables.includes(variable.id) ? '未使用の変数です' : '使用中の変数です'
                },
                  variable.name,
                  variableUsageInfo.unusedVariables.includes(variable.id) &&
                  React.createElement('span', { className: "ml-2 text-xs text-yellow-300" }, '(未使用)')
                ),
                // コピー（アイコン）ボタン
                React.createElement('button', {
                  onClick: () => handleCopyVariable(variable.name),
                  className: "text-gray-300 hover:text-white",
                  tabIndex: -1,
                  title: `コピー: {{${String(variable.name || '').trim()}}}`,
                  'aria-label': `コピー: {{${String(variable.name || '').trim()}}}`
                },
                  React.createElement('svg', { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M16 8h2a2 2 0 012 2v8a2 2 0 01-2 2H10a2 2 0 01-2-2v-2" })
                  )
                )
              ),
              React.createElement('div', { className: "flex items-center gap-3" },
                // 編集（鉛筆）ボタン
                React.createElement('button', {
                  onClick: () => onEdit && onEdit(variable.id),
                  className: "text-gray-300 hover:text-white",
                  tabIndex: -1,
                  title: "変数を編集"
                },
                  React.createElement('svg', { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15.232 5.232a2.5 2.5 0 013.536 3.536L8.5 19.036H5v-3.5L15.232 5.232z" })
                  )
                ),
                // 削除（バツ）ボタン
                React.createElement('button', {
                  onClick: () => onDelete(variable.id),
                  className: "text-red-400 hover:text-red-300",
                  tabIndex: -1,
                  title: "変数を削除"
                },
                  React.createElement('svg', { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })
                  )
                )
              )
            ),
            React.createElement(Components.VariableInput, {
              variable: variable,
              onChange: (updated) => onUpdate(originalIndex, updated),
              onCommitValue: onCommitValue,
              suggestions: (suggestions && suggestions[variable.name]) ? suggestions[variable.name] : {},
              onSuggestOpen: handleSuggestOpen,
              onSuggestClose: handleSuggestClose
            })
          )
        )),
        React.createElement('div', { style: { height: (extraBottomSpace || 0) + 'px' }, 'aria-hidden': true })
      )
    )
  );
});

VariablesPanel.displayName = 'VariablesPanel';

// グローバル公開
window.Components = window.Components || {};
window.Components.VariablesPanel = VariablesPanel;


