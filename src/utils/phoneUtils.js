/**
 * 電話番号関連ユーティリティ
 * - 日本の電話番号フォーマット
 * - 変数名から電話系の推定
 * 末尾で window.Helpers へ公開
 */

/**
 * 日本の電話番号フォーマッタ
 * 入力から数字のみを抽出し、日本の一般的な電話番号規則に基づいてハイフンを自動挿入する
 *
 * 対応例:
 * - 携帯電話/データ通信: 070/080/090/020/050 先頭の11桁 → 3-4-4
 * - フリーダイヤル: 0120 先頭の10桁 → 4-3-3
 * - ナビダイヤル: 0570 先頭の10桁 → 4-3-3
 * - 0800（フリーコール）: 0800 先頭の11桁 → 4-3-4
 * - 固定電話（東京/大阪）: 03/06 先頭の10桁 → 2-4-4
 * - 固定電話（その他・簡易ルール）: 先頭0かつ10桁 → 3-3-4
 * - 上記以外や桁数が適合しない場合 → ハイフンなし（数字のみ）を返す
 *
 * 注意:
 * - 完全な市外局番辞書を持たない簡易実装。主要なパターンを優先的に整形する。
 *
 * @param {string} input - 入力文字列（数字以外が含まれていてもよい）
 * @returns {string} ハイフン整形済みの電話番号文字列（不適合時は数字のみ）
 */
const formatJapanesePhone = (input) => {
    const normalized = String(input ?? '').replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    const digits = normalized.replace(/\D/g, '');
    if (digits.length === 0) return '';

    try {
        if (typeof window !== 'undefined' && window.libphonenumber) {
            const asYouType = new window.libphonenumber.AsYouType('JP');
            asYouType.input(digits);
            const formatted = asYouType.formattedOutput || asYouType.getNumberValue() || '';
            if (formatted) return String(formatted).trim();
        }
    } catch (_) {}

    if (digits.startsWith('0120') && digits.length === 10) {
        return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    if (digits.startsWith('0570') && digits.length === 10) {
        return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    if (digits.startsWith('0800') && digits.length === 11) {
        return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }

    const mobilePrefixes = ['070', '080', '090', '050', '020'];
    if (mobilePrefixes.some(p => digits.startsWith(p)) && digits.length === 11) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }

    if ((digits.startsWith('03') || digits.startsWith('06')) && digits.length === 10) {
        return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    if (digits.length === 10 && digits.startsWith('0')) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    if (digits.length === 11) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }

    return digits;
};

/**
 * 変数名からタイプを推定
 * 現状は電話関連（TEL/電話）のみ 'phone' とし、それ以外は 'text'
 *
 * @param {string} name - 変数名
 * @returns {('phone'|'text')} 推定されたタイプ
 */
const guessVariableTypeByName = (name) => {
    const n = String(name || '').trim();
    const upper = n.toUpperCase();
    if (upper === 'TEL' || upper.startsWith('TEL') || n.includes('電話')) {
        return 'phone';
    }
    return 'text';
};

// 公開
window.Helpers = Object.assign(window.Helpers || {}, {
    formatJapanesePhone,
    guessVariableTypeByName
});


