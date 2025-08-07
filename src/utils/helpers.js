// 汎用ヘルパー関数

const generateId = () => Math.random().toString(36).substr(2, 9);

// グローバルに公開
window.Helpers = { generateId };