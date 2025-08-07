/**
 * 定数とサンプルデータ
 * アプリケーションで使用する定数、テンプレート、初期データを定義
 */

/**
 * サンプル変数の生成
 * 初回起動時またはリセット時に使用されるデフォルト変数セット
 *
 * @returns {Array} 変数オブジェクトの配列
 */
const createSampleVariables = () => [
    {
        id: Helpers.generateId(),
        name: '着信時刻',
        type: 'time',
        value: DateUtils.formatDateTime(new Date(), 'HH:mm', {
            enabled: true,
            unit: '5',
            method: 'floor'
        }),
        format: 'HH:mm',
        rounding: {
            enabled: true,
            unit: '5',
            method: 'floor'
        }
    },
    {
        id: Helpers.generateId(),
        name: '相手先名',
        type: 'text',
        value: '山田様'
    },
    {
        id: Helpers.generateId(),
        name: '会社名',
        type: 'text',
        value: '株式会社○○'
    },
    {
        id: Helpers.generateId(),
        name: '用件',
        type: 'text',
        value: '見積もりの件'
    }
];

/**
 * サンプルセグメントの生成
 * 初回起動時またはリセット時に使用されるデフォルトセグメントセット
 * 変数と組み合わせて基本的な電話応答報告の雛形を提供
 *
 * @returns {Array} セグメントオブジェクトの配列
 */
const createSampleSegments = () => [
    { id: Helpers.generateId(), content: '{{着信時刻}}に{{会社名}}の{{相手先名}}より着信がありました。' },
    { id: Helpers.generateId(), content: '' },
    { id: Helpers.generateId(), content: '【用件】' },
    { id: Helpers.generateId(), content: '{{用件}}についてのお問い合わせ' },
    { id: Helpers.generateId(), content: '' },
    { id: Helpers.generateId(), content: '【対応】' },
    { id: Helpers.generateId(), content: '資料を確認の上、折り返しご連絡する旨をお伝えしました。' },
    { id: Helpers.generateId(), content: '明日の午前中までにご連絡予定です。' }
];

/**
 * サンプルテンプレート定義
 * ユーザーが使用できる事前定義テンプレート集
 *
 * segment: 個々の文節テンプレート
 * block: 複数セグメントで構成されるブロックテンプレート
 */
const SAMPLE_TEMPLATES = {
    segment: [
        '{{着信時刻}}に{{会社名}}の{{相手先名}}より着信がありました。',
        '【用件】',
        '【対応】',
        '資料を確認の上、折り返しご連絡する旨をお伝えしました。',
        '担当者不在のため、後ほど折り返しのご連絡を差し上げる旨お伝えしました。',
        '明日の午前中までにご連絡予定です。',
        'ご要望を承り、担当部署へ申し送りいたしました。'
    ],
    block: [
        {
            name: '基本報告テンプレート',
            segments: [
                '{{着信時刻}}に{{会社名}}の{{相手先名}}より着信がありました。',
                '',
                '【用件】',
                '{{用件}}',
                '',
                '【対応】',
                '担当者へ申し送りました。'
            ]
        }
    ]
};

/**
 * 初期入力履歴定義
 * オートコンプリートや履歴機能で使用される初期データ
 *
 * variables: 変数ごとの入力履歴（初期状態では空）
 * segments: セグメント入力時の候補一覧
 */
const INITIAL_INPUT_HISTORY = {
    variables: {},
    segments: ['お世話になっております。', '以上、よろしくお願いいたします。']
};

/**
 * グローバルスコープへの公開
 * モジュラー構成での定数参照を可能にする
 */
window.Constants = {
    createSampleVariables,
    createSampleSegments,
    SAMPLE_TEMPLATES,
    INITIAL_INPUT_HISTORY
};