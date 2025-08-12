/**
 * 自動ブロック選択フック
 * segments が変更された際に、テンプレートの block に完全一致するものがあれば
 * そのインデックスを selected/baseline に自動設定する。
 *
 * @param {Array} segments - 現在のセグメント配列
 * @param {Object} templates - テンプレート {block: Array<{name:string,segments:string[]}>}
 * @param {number} selectedBlockIndex - 現在選択中インデックス（選択済みの場合は何もしない）
 * @param {(idx:number)=>void} setSelectedBlockIndex - 選択状態のsetter
 * @param {(idx:number)=>void} setBaselineBlockIndex - baseline状態のsetter
 */
const useAutoSelectBlock = (segments, templates, selectedBlockIndex, setSelectedBlockIndex, setBaselineBlockIndex) => {
  const { useEffect } = React;

  useEffect(() => {
    try {
      if (typeof selectedBlockIndex === 'number' && selectedBlockIndex >= 0) return; // 既に選択済み
      const blocks = Array.isArray(templates?.block) ? templates.block : [];
      if (blocks.length === 0) return;

      const current = (segments || []).map(s => String(s?.content ?? ''));
      const n = current.length;
      for (let i = 0; i < blocks.length; i++) {
        const segs = Array.isArray(blocks[i]?.segments) ? blocks[i].segments.map(s => String(s ?? '')) : [];
        if (segs.length !== n) continue;
        let allEqual = true;
        for (let j = 0; j < n; j++) {
          if (segs[j] !== current[j]) { allEqual = false; break; }
        }
        if (allEqual) {
          setSelectedBlockIndex(i);
          setBaselineBlockIndex(i);
          break;
        }
      }
    } catch (_) {}
  }, [segments, templates, selectedBlockIndex, setSelectedBlockIndex, setBaselineBlockIndex]);
};

// グローバル公開
window.Hooks = window.Hooks || {};
window.Hooks.useAutoSelectBlock = useAutoSelectBlock;


