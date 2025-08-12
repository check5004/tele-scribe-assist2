/**
 * ブロックテンプレート適用操作フック
 * Appから切り出し、ブロックの「末尾に追加」「全置換」の処理を一元化する。
 *
 * 仕様:
 * - applyAppendByIndex(index): 指定ブロックの segments を末尾へ追加し、未登録変数を自動追加
 * - applyReplaceByIndex(index): 指定ブロックで segments/variables を完全置換（変数はテンプレ出現名で同期）
 * - applyBlock(block, mode): TemplateManagerModal からの適用（'append'|'replace'）
 * - 未保存変更の確認は呼び出し側の責務（本フックでは行わない）
 *
 * 依存: window.TemplateUtils.extractVariableNames, window.Helpers.generateId, window.Helpers.guessVariableTypeByName
 *
 * @param {Array} variables - 現在の変数配列
 * @param {Function} setVariables - 変数setter
 * @param {Array} segments - 現在のセグメント配列
 * @param {Function} setSegments - セグメントsetter
 * @param {Object} templates - テンプレート {block: Array}
 * @param {Function} setBaselineBlockIndex - baseline setter
 * @param {Function} saveToUndoStack - Undo保存
 * @returns {{ applyAppendByIndex: Function, applyReplaceByIndex: Function, applyBlock: Function }}
 */
const useTemplateOps = ({ variables, setVariables, segments, setSegments, templates, setBaselineBlockIndex, saveToUndoStack }) => {
  const applyAppendByIndex = (idx) => {
    const block = (templates.block || [])[idx];
    if (!block) return;
    saveToUndoStack && saveToUndoStack();
    const contents = (block.segments || []).map(text => String(text ?? ''));
    setSegments(prev => ([...prev, ...contents.map(text => ({ id: window.Helpers.generateId(), content: text }))]));
    // 追加適用時：未登録変数を追加
    try {
      const names = window.TemplateUtils.extractVariableNames(contents);
      if (names.length > 0) {
        const existing = new Set((variables || []).map(v => v.name));
        const toAdd = names.filter(n => !existing.has(n));
        if (toAdd.length > 0) {
          setVariables(prev => ([
            ...prev,
            ...toAdd.map(name => ({ id: window.Helpers.generateId(), name, type: window.Helpers.guessVariableTypeByName(name), value: '' }))
          ]));
        }
      }
    } catch (_) {}
  };

  const applyReplaceByIndex = (idx) => {
    const block = (templates.block || [])[idx];
    if (!block) return;
    saveToUndoStack && saveToUndoStack();
    const contents = (block.segments || []).map(text => String(text ?? ''));
    const replaced = contents.map(text => ({ id: window.Helpers.generateId(), content: text }));
    setSegments(replaced);
    setBaselineBlockIndex && setBaselineBlockIndex(idx);
    // 変数の完全同期（テンプレに存在する変数だけに）
    try {
      const names = window.TemplateUtils.extractVariableNames(contents);
      const nameToVar = new Map((variables || []).map(v => [v.name, v]));
      const newVars = names.map(name => nameToVar.get(name) || ({ id: window.Helpers.generateId(), name, type: window.Helpers.guessVariableTypeByName(name), value: '' }));
      setVariables(newVars);
    } catch (_) {}
  };

  const applyBlock = (block, mode) => {
    const contents = (block?.segments || []).map(s => String(s ?? ''));
    if (contents.length === 0) return;
    saveToUndoStack && saveToUndoStack();
    if (mode === 'replace') {
      setSegments(contents.map(text => ({ id: window.Helpers.generateId(), content: text })));
      // 変数の完全同期
      try {
        const names = window.TemplateUtils.extractVariableNames(contents);
        const nameToVar = new Map((variables || []).map(v => [v.name, v]));
        const newVars = names.map(name => nameToVar.get(name) || ({ id: window.Helpers.generateId(), name, type: window.Helpers.guessVariableTypeByName(name), value: '' }));
        setVariables(newVars);
      } catch (_) {}
    } else {
      setSegments(prev => ([...prev, ...contents.map(text => ({ id: window.Helpers.generateId(), content: text }))]));
      // 追加適用時：未登録変数を追加
      try {
        const names = window.TemplateUtils.extractVariableNames(contents);
        if (names.length > 0) {
          const existing = new Set((variables || []).map(v => v.name));
          const toAdd = names.filter(n => !existing.has(n));
          if (toAdd.length > 0) {
            setVariables(prev => ([
              ...prev,
              ...toAdd.map(name => ({ id: window.Helpers.generateId(), name, type: window.Helpers.guessVariableTypeByName(name), value: '' }))
            ]));
          }
        }
      } catch (_) {}
    }
  };

  return { applyAppendByIndex, applyReplaceByIndex, applyBlock };
};

// グローバル公開
window.Hooks = window.Hooks || {};
window.Hooks.useTemplateOps = useTemplateOps;


