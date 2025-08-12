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
 * 相対時刻情報を算出する内部補助関数
 * 与えられた対象時刻と基準時刻の差分から、最適な単位（秒/分/時間/日）と値を返す
 *
 * 判定仕様:
 * - 同一日内の差分: 1分未満は「秒」、1時間未満は「分」、それ以外は「時間」
 * - 日付が異なる場合: 日単位で切り捨て差分（日）
 * - 未来時刻が渡された場合は 0秒前 として扱う
 *
 * @param {Date|string|number} target - 対象の時刻（Date/ISO/epoch）
 * @param {Date|string|number} [reference=new Date()] - 基準の時刻（省略時は現在）
 * @returns {{value:number, unit:'seconds'|'minutes'|'hours'|'days', daysDiff:number, sameDay:boolean}} 単位・値等の詳細
 */
const getRelativeTimeInfo = (target, reference = new Date()) => {
    const t = new Date(target);
    const n = new Date(reference);
    const deltaMsRaw = n.getTime() - t.getTime();
    const deltaMs = Math.max(0, deltaMsRaw);

    const sameDay = (
        t.getFullYear() === n.getFullYear() &&
        t.getMonth() === n.getMonth() &&
        t.getDate() === n.getDate()
    );

    // 日差（ローカルの暦日差）
    const startOfN = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    const startOfT = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    const daysDiff = Math.floor((startOfN.getTime() - startOfT.getTime()) / 86400000);

    if (sameDay) {
        if (deltaMs < 60_000) {
            return { value: Math.floor(deltaMs / 1000), unit: 'seconds', daysDiff: 0, sameDay: true };
        }
        if (deltaMs < 3_600_000) {
            return { value: Math.floor(deltaMs / 60_000), unit: 'minutes', daysDiff: 0, sameDay: true };
        }
        return { value: Math.floor(deltaMs / 3_600_000), unit: 'hours', daysDiff: 0, sameDay: true };
    }

    return { value: Math.max(1, daysDiff), unit: 'days', daysDiff: Math.max(1, daysDiff), sameDay: false };
};

/**
 * セッション履歴・お気に入りリスト用の時刻表示を生成する関数
 * 仕様に基づいて表示形式を切り替え、同時に自動更新間隔の判定用ユニットも返す
 *
 * 表示仕様:
 * - 今日（同一日）: `HH:mm - n[秒|分|時間]前`
 *   - 1分未満: 秒前／1時間未満: 分前／それ以外: 時間前
 * - 1週間以内（今日以外）: `M/D HH:mm - n日前`（月/日はゼロ埋めしない）
 * - それ以外: `YYYY/MM/DD HH:mm`（ゼロ埋め、秒は表示しない）
 *
 * 注意: 並べ替えはISOの秒精度を使用する想定のため、表示では秒を含めない
 *
 * @param {Date|string|number} timestamp - 対象の時刻（Date/ISO/epoch）
 * @param {Date|string|number} [reference=new Date()] - 基準の時刻（省略時は現在）
 * @returns {{text:string, updateUnit:'seconds'|'minutes'|'hours'|'none'}} 表示文字列と推奨更新単位
 */
const formatSessionTimestampForList = (timestamp, reference = new Date()) => {
    const t = new Date(timestamp);
    const n = new Date(reference);

    const two = (num) => String(num).padStart(2, '0');
    const hh = two(t.getHours());
    const mm = two(t.getMinutes());

    const { value, unit, daysDiff, sameDay } = getRelativeTimeInfo(t, n);

    if (sameDay) {
        const rel = unit === 'seconds' ? `${value}秒前` : unit === 'minutes' ? `${value}分前` : `${value}時間前`;
        const updateUnit = unit; // 秒/分/時間のいずれか
        return { text: `${hh}:${mm} - ${rel}`, updateUnit };
    }

    if (daysDiff < 7) {
        // M/D HH:mm - n日前（M/D は非ゼロ埋め）
        const M = t.getMonth() + 1;
        const D = t.getDate();
        return { text: `${M}/${D} ${hh}:${mm} - ${daysDiff}日前`, updateUnit: 'none' };
    }

    // YYYY/MM/DD HH:mm（ゼロ埋め）
    const YYYY = t.getFullYear();
    const MM = two(t.getMonth() + 1);
    const DD = two(t.getDate());
    return { text: `${YYYY}/${MM}/${DD} ${hh}:${mm}`, updateUnit: 'none' };
};

/**
 * グローバルスコープへの公開
 * モジュラー構成でのユーティリティ参照を可能にする
 */
window.DateUtils = { formatDateTime, getRelativeTimeInfo, formatSessionTimestampForList };