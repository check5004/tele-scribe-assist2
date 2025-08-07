/**
 * ローカルストレージ管理フック
 * アプリケーションデータの永続化と読み込み機能を提供
 *
 * 機能:
 * - ユーザーデータのローカルストレージへの保存
 * - ブラウザ起動時のデータ復元
 * - JSONシリアライゼーションでのデータ格納
 * - エラーハンドリング付きの安全なデータ操作
 *
 * @returns {Object} loadDataとsaveData関数を含むオブジェクト
 */
const useLocalStorage = () => {
    const { useEffect } = React;

    /**
     * ローカルストレージからデータを読み込み
     * JSONパースエラーに対する例外処理を含む
     *
     * @returns {Object|null} パースされたデータまたはnull
     */
    const loadData = () => {
        const loadedData = localStorage.getItem('telescribeAssistData');
        if (loadedData) {
            try {
                return JSON.parse(loadedData);
            } catch (e) {
                console.error('Failed to load data:', e);
                return null;
            }
        }
        return null;
    };

    /**
     * データをローカルストレージに保存
     * アプリケーションの全状態を統合して保存
     *
     * @param {Array} variables - 変数配列
     * @param {Array} segments - セグメント配列
     * @param {Array} sessionHistory - セッション履歴配列
     * @param {Object} templates - テンプレートオブジェクト
     * @param {Object} inputHistory - 入力履歴オブジェクト
     */
    const saveData = (variables, segments, sessionHistory, templates, inputHistory) => {
        const dataToSave = {
            variables,
            segments,
            sessionHistory,
            templates,
            inputHistory
        };
        localStorage.setItem('telescribeAssistData', JSON.stringify(dataToSave));
    };

    return { loadData, saveData };
};

/**
 * グローバルスコープへの公開
 * モジュラー構成でのフック参照を可能にする
 */
window.Hooks = window.Hooks || {};
window.Hooks.useLocalStorage = useLocalStorage;