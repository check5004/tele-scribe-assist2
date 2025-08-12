/**
 * Diffステータス管理フック
 * 選択中の基準ブロック(baseline)と現在のsegmentsを比較し、
 * 各行の変更状態('new'|'edited'|null)と削除インジケータ位置（deletionMarkers）を計算する。
 * さらに、未保存変更の有無を判定するグローバルヘルパーを window に公開する。
 *
 * 依存: window.DiffUtils.computeDiffAlignment
 *
 * @param {Array} segments - 現在のセグメント配列
 * @param {Object} templates - テンプレート {block: Array}
 * @param {number} selectedBlockIndex - 選択中ブロックインデックス
 * @param {number} baselineBlockIndex - 比較基準ブロックインデックス（未指定時はselectedを使用）
 * @returns {{ segmentChangeStatus: Array, deletionMarkers: number[], setSegmentChangeStatus: Function, setDeletionMarkers: Function }}
 */
const useDiffStatus = (segments, templates, selectedBlockIndex, baselineBlockIndex) => {
  const { useEffect, useState } = React;

  const [segmentChangeStatus, setSegmentChangeStatus] = useState([]);
  const [deletionMarkers, setDeletionMarkers] = useState([]);

  // 変更ステータス再計算
  useEffect(() => {
    const baseIdx = (typeof baselineBlockIndex === 'number' && baselineBlockIndex >= 0)
      ? baselineBlockIndex
      : selectedBlockIndex;
    const baseline = (templates && templates.block ? templates.block : [])[baseIdx]?.segments || [];
    const current = (segments || []).map(s => String(s?.content ?? ''));

    try {
      const { pairs, deletions } = window.DiffUtils.computeDiffAlignment(
        baseline.map(s => String(s ?? '')),
        current
      );
      const currentIndexToBaselineIndex = new Map();
      for (const [bi, cj] of pairs) currentIndexToBaselineIndex.set(cj, bi);
      const nextStatus = current.map((content, j) => {
        if (!currentIndexToBaselineIndex.has(j)) {
          return 'new';
        }
        const bi = currentIndexToBaselineIndex.get(j);
        const baseContent = String(baseline[bi] ?? '');
        return content === baseContent ? null : 'edited';
      });
      setSegmentChangeStatus(nextStatus);
      setDeletionMarkers(deletions);
    } catch (_) {
      setSegmentChangeStatus((segments || []).map(() => null));
      setDeletionMarkers([]);
    }
  }, [segments, templates, selectedBlockIndex, baselineBlockIndex]);

  // 未保存変更判定のグローバルヘルパー
  useEffect(() => {
    window.__telescribe_hasUnsavedChanges = () =>
      (segmentChangeStatus || []).some(s => s === 'new' || s === 'edited') ||
      (deletionMarkers && deletionMarkers.length > 0);
    return () => { try { delete window.__telescribe_hasUnsavedChanges; } catch (_) {} };
  }, [segmentChangeStatus, deletionMarkers]);

  return { segmentChangeStatus, deletionMarkers, setSegmentChangeStatus, setDeletionMarkers };
};

// グローバル公開
window.Hooks = window.Hooks || {};
window.Hooks.useDiffStatus = useDiffStatus;


