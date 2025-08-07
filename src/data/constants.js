// 定数とサンプルデータ

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

const INITIAL_INPUT_HISTORY = {
    variables: {},
    segments: ['お世話になっております。', '以上、よろしくお願いいたします。']
};

// グローバルに公開
window.Constants = {
    createSampleVariables,
    createSampleSegments,
    SAMPLE_TEMPLATES,
    INITIAL_INPUT_HISTORY
};