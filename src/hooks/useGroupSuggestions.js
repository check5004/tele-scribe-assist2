/**
 * グループ補完候補管理フック
 * 入力履歴(valueGroups)と現在の変数/値に基づいて、各変数へのグループ候補をスコアリングし算出する。
 * また、UIで利用する `variableSuggestions`（name→{history, groupValues}）も提供する。
 *
 * 仕様:
 * - time 型の変数は候補対象外
 * - スコア: 入力済み変数での完全一致数 / 対象数（未入力は評価対象外）
 * - ソート: ①スコア降順 ②一致数降順 ③新しいグループ優先（配列先頭ほど新しい）
 * - 各変数に対し上位グループから最大3件の候補値を重複除外で抽出
 * - `commitVariableValue` は変更契機時に最新候補を再計算するための軽量フック
 *
 * @param {Array} variables - 現在の変数配列
 * @param {Object} inputHistory - 入力履歴（ensureInputHistoryShapeで補完可能な形）
 * @param {Object} [externalSuggestions] - 外部から提供される name→{groupValues} 初期候補
 * @returns {{ variableSuggestions: Object, groupSuggestions: Object, commitVariableValue: Function, setGroupSuggestions: Function }}
 */
const useGroupSuggestions = (variables, inputHistory, externalSuggestions = {}) => {
  const { useMemo, useEffect, useState, useCallback } = React;

  const [groupSuggestions, setGroupSuggestions] = useState({});

  /**
   * 緑の候補Chip（グループ補完）の再計算
   * 現在の変数集合と過去の valueGroups の一致度を評価して、各変数に候補を提示
   * @returns {Object} name -> { groupValues: string[] }
   */
  const computeBestGroupSuggestions = useCallback(() => {
    try {
      const shaped = (window.Helpers && typeof window.Helpers.ensureInputHistoryShape === 'function')
        ? window.Helpers.ensureInputHistoryShape(inputHistory)
        : (inputHistory || { variables: {}, segments: [], variableNames: [], valueGroups: [] });
      const groups = Array.isArray(shaped.valueGroups) ? shaped.valueGroups : [];
      if (!groups.length) return {};

      const nameToType = new Map((variables || []).map(v => [v.name, v.type]));
      const currentByName = new Map((variables || []).map(v => [v.name, String(v.value ?? '')]));

      // 各グループの一致度を算出し、スコア順にソート
      const scored = [];
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const gv = g && g.variables ? g.variables : {};
        let considered = 0;
        let matches = 0;
        for (const [name, val] of currentByName.entries()) {
          const t = nameToType.get(name) || 'text';
          if (t === 'time') continue;
          if (!val) continue;
          considered++;
          if (Object.prototype.hasOwnProperty.call(gv, name) && String(gv[name] ?? '') === val) {
            matches++;
          }
        }
        if (considered === 0) continue;
        if (matches === 0) continue; // 一致ゼロのグループは候補から除外
        const score = matches / considered;
        scored.push({ idx: i, score, matches });
      }
      scored.sort((a, b) => (
        b.score - a.score ||
        b.matches - a.matches ||
        a.idx - b.idx // 新しい方（idx小）が先
      ));

      // 各フィールドについて、上位グループから最大3件の候補を収集
      const suggested = {};
      for (const [name, type] of nameToType.entries()) {
        if (type === 'time') continue;
        const vals = [];
        for (const item of scored) {
          const g = groups[item.idx];
          const wv = (g && g.variables) ? g.variables : {};
          if (!Object.prototype.hasOwnProperty.call(wv, name)) continue;
          const val = String(wv[name] ?? '');
          if (!val) continue;
          if (!vals.includes(val)) vals.push(val);
          if (vals.length >= 3) break;
        }
        if (vals.length > 0) suggested[name] = { groupValues: vals };
      }
      return suggested;
    } catch (_) {
      return {};
    }
  }, [inputHistory, variables]);

  // 変数値が変化するたび（Change）に緑Chip候補を更新
  useEffect(() => {
    const next = computeBestGroupSuggestions();
    setGroupSuggestions(next);
  }, [computeBestGroupSuggestions]);

  /**
   * UI向け複合サジェスト: name→{ history, groupValues }
   * - history は valueGroups から導出（重複除外）
   * - groupValues は計算済み groupSuggestions と外部提供の補強をマージ
   */
  const variableSuggestions = useMemo(() => {
    const byName = {};
    const shaped = (window.Helpers && window.Helpers.ensureInputHistoryShape)
      ? window.Helpers.ensureInputHistoryShape(inputHistory)
      : (inputHistory || { variables: {}, segments: [], variableNames: [], valueGroups: [] });
    const groups = Array.isArray(shaped.valueGroups) ? shaped.valueGroups : [];
    (variables || []).forEach(v => {
      const name = v.name;
      const acc = [];
      for (const g of groups) {
        if (!g || !g.variables) continue;
        if (Object.prototype.hasOwnProperty.call(g.variables, name)) {
          const val = String(g.variables[name] ?? '');
          if (val && !acc.includes(val)) acc.push(val);
        }
      }
      byName[name] = { history: acc };
      // groupValues: 内部計算と外部提供のマージ（外部優先）
      const internal = (groupSuggestions && groupSuggestions[name] && groupSuggestions[name].groupValues) || [];
      const external = (externalSuggestions && externalSuggestions[name] && externalSuggestions[name].groupValues) || [];
      const merged = [...external, ...internal].filter((x, i, arr) => arr.indexOf(x) === i);
      if (merged.length > 0) byName[name].groupValues = merged;
    });
    return byName;
  }, [variables, inputHistory, groupSuggestions, externalSuggestions]);

  /**
   * 値コミット時の軽量トリガ（Changeベース更新に合わせて再評価）
   */
  const commitVariableValue = useCallback((_name, _value, _type) => {
    try {
      const next = computeBestGroupSuggestions();
      setGroupSuggestions(next);
    } catch (_) {}
  }, [computeBestGroupSuggestions]);

  return { variableSuggestions, groupSuggestions, setGroupSuggestions, commitVariableValue };
};

// グローバル公開
window.Hooks = window.Hooks || {};
window.Hooks.useGroupSuggestions = useGroupSuggestions;


