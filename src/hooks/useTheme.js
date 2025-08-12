/**
 * テーマ管理フック
 * ライト/ダークテーマの状態管理・DOM反映・永続化(localStorage)を一元管理する。
 *
 * 仕様:
 * - 初期化時に localStorage の `telescribeAssistTheme` を参照し、'light' 指定時のみライト適用
 * - 状態変更に応じて <html> 要素へ `theme-light` クラスを付与/削除
 * - 変更は即時 localStorage へ保存
 *
 * 戻り値:
 * - theme: 'light' | 'dark'
 * - toggleTheme: 次のテーマへトグルする関数
 *
 * 使用例:
 * const { theme, toggleTheme } = Hooks.useTheme();
 *
 * @returns {{ theme: ('light'|'dark'), toggleTheme: () => void }} テーマ状態とトグル関数
 */
const useTheme = () => {
  const { useState, useEffect, useCallback } = React;

  /**
   * テーマ設定を永続化するためのLocalStorageキー
   * @type {string}
   */
  const THEME_STORAGE_KEY = 'telescribeAssistTheme';

  // 初期テーマ: localStorage から復元（デフォルト: 'dark'）
  const [theme, setTheme] = useState(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      return saved === 'light' ? 'light' : 'dark';
    } catch (_) {
      return 'dark';
    }
  });

  /**
   * テーマクラスの適用
   * - ルート要素(html) に `theme-light` クラスを付与/削除して一括上書き
   */
  useEffect(() => {
    try {
      const rootEl = document.documentElement;
      if (!rootEl) return;
      if (theme === 'light') {
        rootEl.classList.add('theme-light');
      } else {
        rootEl.classList.remove('theme-light');
      }
    } catch (_) {}
  }, [theme]);

  /**
   * テーマの永続化
   */
  useEffect(() => {
    try { window.localStorage.setItem(THEME_STORAGE_KEY, theme); } catch (_) {}
  }, [theme]);

  /**
   * テーマ切り替え操作
   * @returns {void}
   */
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return { theme, toggleTheme };
};

// グローバル公開
window.Hooks = window.Hooks || {};
window.Hooks.useTheme = useTheme;


