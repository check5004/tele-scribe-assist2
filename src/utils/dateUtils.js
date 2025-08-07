// 日付・時刻関連のユーティリティ関数

const formatDateTime = (date, format, rounding = null) => {
    let d = new Date(date);

    // 丸め処理
    if (rounding && rounding.enabled) {
        const minutes = d.getMinutes();
        const unit = parseInt(rounding.unit);
        let rounded;

        if (rounding.method === 'floor') {
            rounded = Math.floor(minutes / unit) * unit;
        } else if (rounding.method === 'ceil') {
            rounded = Math.ceil(minutes / unit) * unit;
        } else { // round
            rounded = Math.round(minutes / unit) * unit;
        }

        d.setMinutes(rounded);
        d.setSeconds(0);
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
};

// グローバルに公開
window.DateUtils = { formatDateTime };