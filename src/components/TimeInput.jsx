/**
 * 時刻入力コンポーネント
 * 時刻変数専用の入力インターフェース、調整機能、詳細設定を提供
 *
 * 主な機能:
 * - フォーマット分割された時刻入力フィールド
 * - 時刻調整ボタン（加算・減算）
 * - 現在時刻リロード機能
 * - 詳細設定モーダルとの連携
 * - 丸め設定に応じた自動調整
 *
 * @param {Object} props - コンポーネントのプロパティ
 * @param {Object} props.variable - 時刻変数オブジェクト
 * @param {Function} props.onChange - 変数変更時のコールバック関数
 * @returns {JSX.Element} 時刻入力コンポーネントのJSX要素
 */
const TimeInput = React.memo(({ variable, onChange }) => {
    const [showAdvancedModal, setShowAdvancedModal] = React.useState(false);
    const [needsReloadHighlight, setNeedsReloadHighlight] = React.useState(false);

    /**
     * 文字列化された時刻値をフォーマットに基づいて Date に変換する補助関数
     * - フォーマットに含まれるトークン（YYYY/MM/DD/HH/mm/ss）から数値を抽出して生成
     * - 不足するトークンは「今日」の値で補完
     * - 時・分が特定できない場合は、末尾2つの数値グループを「時:分」としてフォールバック
     *
     * @param {string} value - 解析対象の時刻文字列
     * @param {string} format - 対応するフォーマット文字列
     * @returns {Date|null} 解析に成功した場合は Date、失敗時は null
     */
    function parseDateFromFormattedValue(value, format) {
        try {
            const v = String(value ?? '').trim();
            if (!v) return null;

            const tokens = String(format || '').split(/[^YMDHms]+/).filter(Boolean);
            const groups = v.match(/\d+/g) || [];

            const now = new Date();
            let year = now.getFullYear();
            let month = now.getMonth() + 1; // 1-12
            let day = now.getDate();
            let hours = 0;
            let minutes = 0;
            let seconds = 0;

            // トークンに基づく厳密パース
            for (let i = 0; i < tokens.length; i++) {
                const t = tokens[i];
                const numStr = groups[i];
                if (!numStr) continue;
                const num = parseInt(numStr, 10);
                if (Number.isNaN(num)) continue;
                if (t === 'YYYY') year = num;
                else if (t === 'MM') month = num;
                else if (t === 'DD') day = num;
                else if (t === 'HH') hours = num;
                else if (t === 'mm') minutes = num;
                else if (t === 'ss') seconds = num;
            }

            // 時・分が判定できない場合は末尾2グループを時:分として使用
            if (!tokens.includes('HH') || !tokens.includes('mm')) {
                if (groups.length >= 2) {
                    const [hStr, mStr] = groups.slice(-2);
                    const h = parseInt(hStr, 10);
                    const m = parseInt(mStr, 10);
                    if (!Number.isNaN(h) && !Number.isNaN(m)) {
                        hours = h;
                        minutes = m;
                    }
                }
            }

            // Date生成（月は0始まり）
            const d = new Date(year, Math.max(0, (month | 0) - 1), day | 0, hours | 0, minutes | 0, seconds | 0, 0);
            if (isNaN(d.getTime())) return null;
            return d;
        } catch (_) {
            return null;
        }
    }

    /**
     * 現在時刻リロード推奨ハイライトの自動判定
     * 丸め設定（enabled/unit/method）とフォーマットに基づき、1分ごとに現在時刻を再評価して
     * 表示中の値（variable.value）と差異が生じたタイミングでボタンをハイライトする。
     *
     * 判定仕様:
     * - 判定値: DateUtils.formatDateTime(new Date(), format, rounding)
     * - これが variable.value と異なる場合に true（＝リロード推奨）
     * - 現在時刻との差が10分以上（過去・未来問わず）の場合にハイライト
     * - 丸めOFFでも、分や秒がフォーマットに含まれる場合は毎分/毎秒で変化し得るため、そのまま差分判定
     * - 秒は format に含まれていても DateUtils 側で丸め時に 0 固定となる仕様だが、丸めOFFなら秒も比較対象
     */
    React.useEffect(() => {
        let timerId = null;

        const evaluate = () => {
            try {
                const now = new Date();
                const formattedNow = DateUtils.formatDateTime(now, variable.format, variable.rounding);
                const currentValue = String(variable.value ?? '');

                // 値が空ならハイライト不要
                if (!currentValue) { setNeedsReloadHighlight(false); return; }

                // 丸めを考慮した「今」と異なるかを先に判定（リロード価値の前提条件）
                if (formattedNow === currentValue) { setNeedsReloadHighlight(false); return; }

                // 現在の表示値の日時を推定して差分を計算（10分以上の差でハイライト）
                const parsed = parseDateFromFormattedValue(currentValue, variable.format);
                if (!parsed) { setNeedsReloadHighlight(false); return; }
                const diffMs = now.getTime() - parsed.getTime();
                const minutesDiff = Math.abs(Math.floor(diffMs / 60000)); // 絶対値で過去・未来問わず判定
                setNeedsReloadHighlight(minutesDiff >= 10);
            } catch (e) {
                // 例外時はハイライトを無効化（安全側）
                setNeedsReloadHighlight(false);
            }
        };

        // 初回判定
        evaluate();

        // 1分ごとの定期チェック（ユーザー要望）
        timerId = setInterval(evaluate, 60 * 1000);

        return () => { try { clearInterval(timerId); } catch (_) {} };
    }, [variable.format, variable.rounding, variable.value]);

    /**
     * 現在時刻でリロードする処理
     * 丸め設定を適用した現在時刻でvariableの値を更新
     */
    const handleReloadCurrentTime = React.useCallback(() => {
        const newVariable = {
            ...variable,
            value: DateUtils.formatDateTime(new Date(), variable.format, variable.rounding)
        };
        onChange(newVariable);
    }, [variable, onChange]);

    /**
     * 時刻調整処理（加算・減算）
     * 現在の時刻値を丸め単位分だけ調整
     * 丸め設定がOFFの場合は1分単位で調整
     * @param {number} direction - 調整方向（1: 加算, -1: 減算）
     */
    const handleTimeAdjustment = React.useCallback((direction) => {
        try {
            // 現在の値から日時を復元
            const currentValue = variable.value || '';

            // 丸め設定がOFFの場合は1分、ONの場合は設定された単位を使用
            const roundingEnabled = variable.rounding?.enabled ?? false;
            const adjustmentUnit = roundingEnabled
                ? parseInt(variable.rounding?.unit || '5', 10)
                : 1;

            // 現在時刻をベースに、入力値の時刻部分を適用
            const now = new Date();
            let targetDate = new Date(now);

            // フォーマットに基づいて HH と mm の位置を特定し、対応する数値を抽出
            const formatTokens = (variable.format || '').split(/[^YMDHms]+/).filter(Boolean);
            const numericGroups = currentValue.match(/\d+/g) || [];
            const hoursIndex = formatTokens.findIndex((t) => t === 'HH');
            const minutesIndex = formatTokens.findIndex((t) => t === 'mm');

            let parsed = false;
            if (hoursIndex !== -1 && minutesIndex !== -1) {
                const hoursStr = numericGroups[hoursIndex] ?? '';
                const minutesStr = numericGroups[minutesIndex] ?? '';
                if (hoursStr && minutesStr) {
                    const hours = parseInt(hoursStr, 10);
                    const minutes = parseInt(minutesStr, 10);
                    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
                        targetDate.setHours(hours, minutes, 0, 0);
                        parsed = true;
                    }
                }
            }

            // フォールバック: 末尾の2つの数値グループを時:分と見なす
            if (!parsed && numericGroups.length >= 2) {
                const [hoursStr, minutesStr] = numericGroups.slice(-2);
                const hours = parseInt(hoursStr, 10);
                const minutes = parseInt(minutesStr, 10);
                if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
                    targetDate.setHours(hours, minutes, 0, 0);
                }
            }

            // 調整単位分だけ調整
            targetDate.setMinutes(targetDate.getMinutes() + (adjustmentUnit * direction));

            // 新しい値でvariableを更新
            const newVariable = {
                ...variable,
                value: DateUtils.formatDateTime(targetDate, variable.format, variable.rounding)
            };
            onChange(newVariable);
        } catch (error) {
            console.error('時刻調整エラー:', error);
            // エラー時は現在時刻をベースにリセット
            handleReloadCurrentTime();
        }
    }, [variable, onChange, handleReloadCurrentTime]);

    /**
     * 入力フィールド値変更処理
     * 分割された入力フィールドの値を結合して最終値を生成
     * @param {number} partIndex - 変更対象のパートインデックス
     * @param {string} newValue - 新しい値
     */
    const handleFieldChange = React.useCallback((partIndex, newValue) => {
        // 各フィールドの値を結合して最終的な値を構成
        const values = variable.value?.split(/[^0-9]+/) || [];
        const separators = variable.format.match(/[^YMDHms]+/g) || [];

        values[partIndex] = newValue;
        const finalValue = values.reduce((acc, val, idx) => {
            return acc + val + (separators[idx] || '');
        }, '');

        onChange({ ...variable, value: finalValue });
    }, [variable, onChange]);

    /**
     * 詳細設定モーダルの変更処理
     * モーダルからの変更を受け取り、親コンポーネントに伝播
     * @param {Object} updatedVariable - 更新された変数オブジェクト
     */
    const handleModalChange = React.useCallback((updatedVariable) => {
        onChange(updatedVariable);
    }, [onChange]);

    // フォーマットをパーツと区切り文字に分割
    // 末尾がトークン以外（例: "分"）で終わると空文字が生成されるため除外
    const parts = variable.format.split(/[^YMDHms]+/).filter(Boolean);
    const separators = variable.format.match(/[^YMDHms]+/g) || [];

    return React.createElement('div', { className: "space-y-3" },
        // 時刻入力メインセクション
        React.createElement('div', { className: "space-y-2" },
            // 入力フィールドと操作ボタンを左寄せで密着配置
            React.createElement('div', { className: "flex items-center gap-1" },
                // 時刻入力フィールド群
                parts.map((part, i) => {
                    const fieldValue = variable.value?.split(/[^0-9]+/)[i] || '';
                    const isFieldEmpty = !String(fieldValue).trim();
                    return React.createElement(React.Fragment, { key: i },
                        React.createElement('input', {
                            type: "text",
                            value: fieldValue,
                            onChange: (e) => handleFieldChange(i, e.target.value),
                            className: ("w-16 px-2 py-1 bg-gray-700 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500" + (isFieldEmpty ? " tsa-input-empty" : "")),
                            placeholder: part
                        }),
                        i < separators.length && React.createElement('span', { className: "text-gray-400" }, separators[i])
                    );
                }),

                // 時刻調整ボタングループ（マイナス・プラス）
                React.createElement('div', { className: "ml-2 flex" },
                    // マイナスボタン
                    React.createElement('button', {
                        onClick: () => handleTimeAdjustment(-1),
                        className: "px-2 py-1 bg-gray-700 rounded-l-md hover:bg-gray-600 transition-colors text-gray-300 hover:text-white flex items-center justify-center border-r border-gray-600",
                        tabIndex: -1,
                        title: `${variable.rounding?.unit || '1'}分減算`
                    }, '－'),
                    // プラスボタン
                    React.createElement('button', {
                        onClick: () => handleTimeAdjustment(1),
                        className: "px-2 py-1 bg-gray-700 rounded-r-md hover:bg-gray-600 transition-colors text-gray-300 hover:text-white flex items-center justify-center",
                        tabIndex: -1,
                        title: `${variable.rounding?.unit || '1'}分加算`
                    }, '＋')
                ),

                // 現在時刻リロードボタン
                React.createElement('button', {
                    onClick: handleReloadCurrentTime,
                    className: (
                        "ml-2 px-2 py-1 rounded-md transition-colors flex items-center justify-center " +
                        (needsReloadHighlight
                            ? "bg-blue-700 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white")
                    ),
                    title: needsReloadHighlight ? "現在時刻と差があります。クリックして更新" : "現在時刻でリロード"
                }, '🔄'),

                // 詳細設定歯車アイコンボタン
                React.createElement('button', {
                    onClick: () => setShowAdvancedModal(true),
                    className: "ml-2 px-2 py-1 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors text-gray-300 hover:text-white flex items-center justify-center",
                    tabIndex: -1,
                    title: "詳細設定"
                }, '⚙️')
            )
        ),

        // 詳細設定モーダル
        React.createElement(Components.TimeVariableSettingsModal, {
            variable: variable,
            onChange: handleModalChange,
            isOpen: showAdvancedModal,
            onClose: () => setShowAdvancedModal(false)
        })
    );
});

// 表示名の設定（デバッグ用）
TimeInput.displayName = 'TimeInput';

/**
 * グローバルスコープへの公開
 * モジュラー構成でのコンポーネント参照を可能にする
 */
window.Components = window.Components || {};
window.Components.TimeInput = TimeInput;
