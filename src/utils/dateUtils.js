/**
 * 日付・時刻関連のユーティリティ関数
 * 日付と時刻のフォーマット、丸め処理機能を提供
 */

/**
 * 日付・時刻のフォーマット関数
 * 指定したフォーマットで日付を文字列化し、オプションで時刻の丸め処理を実行
 *
 * サポートするフォーマットトークン:
 * - YYYY: 4桁年
 * - MM: 2桁月
 * - DD: 2桁日
 * - HH: 24時間形式の時間
 * - mm: 分
 * - ss: 秒
 *
 * @param {Date|string} date - フォーマットする日付オブジェクト
 * @param {string} format - 出力フォーマット文字列
 * @param {Object|null} rounding - 丸め設定オブジェクト
 * @param {boolean} rounding.enabled - 丸め機能の有効/無効
 * @param {string} rounding.unit - 丸め単位（分単位）
 * @param {string} rounding.method - 丸め方法（'floor'、'ceil'、'round'）
 * @returns {string} フォーマットされた日付文字列
 */
const formatDateTime = (date, format, rounding = null) => {
    let d = new Date(date);

    /**
     * 時刻の丸め処理
     * 指定された単位で時刻を丸める（例: 5分単位で切り下げ）
     */
    if (rounding && rounding.enabled) {
        const minutes = d.getMinutes();
        const unit = parseInt(rounding.unit);
        let rounded;

        // 丸め方法による分岐
        if (rounding.method === 'floor') {
            rounded = Math.floor(minutes / unit) * unit; // 切り下げ
        } else if (rounding.method === 'ceil') {
            rounded = Math.ceil(minutes / unit) * unit; // 切り上げ
        } else { // round
            rounded = Math.round(minutes / unit) * unit; // 四捨五入
        }

        d.setMinutes(rounded);
        d.setSeconds(0); // 秒は0にリセット
    }

    /**
     * 日付コンポーネントの抽出とフォーマット
     * 各コンポーネントを文字列に変換し、2桁のゼロパディングを適用
     */
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0'); // 月は0基準なので+1
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    /**
     * フォーマットトークンの置換
     * フォーマット文字列内のトークンを実際の値に置き換え
     */
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
};

/**
 * グローバルスコープへの公開
 * モジュラー構成でのユーティリティ参照を可能にする
 */
window.DateUtils = { formatDateTime };