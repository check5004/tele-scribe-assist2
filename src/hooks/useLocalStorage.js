// ローカルストレージ管理フック
const useLocalStorage = () => {
    const { useEffect } = React;

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

// グローバルに公開
window.Hooks = window.Hooks || {};
window.Hooks.useLocalStorage = useLocalStorage;