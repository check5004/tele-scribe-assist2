/**
 * 共通ダイアログUIコンポーネント
 * アラート/確認ダイアログをアプリ全体で統一デザインで提供する。
 *
 * 提供API:
 * - window.UI.alert({ title?:string, message:string, okText?:string }): Promise<void>
 * - window.UI.confirm({ title?:string, message:string, okText?:string, cancelText?:string }): Promise<boolean>
 *
 * 実装方針:
 * - 呼び出し毎にbody直下へ一時的なコンテナを生成し、Reactで描画
 * - ボタン操作/ESC/背景クリックでクローズ
 * - 初期フォーカスはOKボタンへ移動
 * - メッセージは改行保持（whitespace-pre-wrap）
 */
const UIDialogs = (() => {
    const createContainer = () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        return container;
    };

    const destroyContainer = (container) => {
        try { ReactDOM.unmountComponentAtNode(container); } catch (_) {}
        try { container.remove(); } catch (_) {}
    };

    /**
     * 簡易ベースモーダル
     * @param {Object} props - プロパティ
     * @param {string} props.title - タイトル
     * @param {string} props.message - 本文（改行保持）
     * @param {React.ReactNode} props.footer - フッター（ボタン群）
     * @param {Function} props.onClose - クローズ時コールバック
     * @returns {JSX.Element}
     */
    const BaseModal = ({ title, message, footer, onClose }) => {
        const dialogRef = React.useRef(null);
        const okButtonRef = React.useRef(null);

        React.useEffect(() => {
            try { okButtonRef.current && okButtonRef.current.focus(); } catch (_) {}
            const onKeyDown = (e) => {
                try {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        onClose && onClose('escape');
                    }
                } catch (_) {}
            };
            document.addEventListener('keydown', onKeyDown);
            return () => { try { document.removeEventListener('keydown', onKeyDown); } catch (_) {} };
        }, [onClose]);

        return React.createElement('div', {
            className: 'fixed inset-0 bg-black/60 flex items-center justify-center z-50',
            onClick: (e) => { if (e.target === e.currentTarget) onClose && onClose('backdrop'); }
        },
            React.createElement('div', {
                ref: dialogRef,
                className: 'bg-gray-800 rounded-lg w-[min(100vw,480px)] max-w-[92vw] p-6',
                onClick: (e) => e.stopPropagation(),
                role: 'dialog',
                'aria-modal': true
            },
                React.createElement('div', { className: 'flex items-center justify-between mb-4' },
                    React.createElement('h3', { className: 'text-lg font-semibold' }, String(title || '')),
                    React.createElement('button', { className: 'text-gray-300 hover:text-white', onClick: () => onClose && onClose('close') }, '×')
                ),
                React.createElement('div', { className: 'text-sm whitespace-pre-wrap text-gray-200' }, String(message || '')),
                React.createElement('div', { className: 'flex justify-end gap-2 mt-6' },
                    typeof footer === 'function' ? footer(okButtonRef) : footer
                )
            )
        );
    };

    /**
     * アラート（OKのみ）
     * @param {{title?:string,message:string,okText?:string}} props - プロパティ
     */
    const AlertDialog = ({ title = 'お知らせ', message = '', okText = 'OK', onResolve }) => {
        return React.createElement(BaseModal, {
            title,
            message,
            onClose: () => onResolve && onResolve(),
            footer: (okRef) => [
                React.createElement('button', {
                    key: 'ok',
                    ref: okRef,
                    className: 'px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700',
                    onClick: () => onResolve && onResolve()
                }, String(okText || 'OK'))
            ]
        });
    };

    /**
     * 確認（OK/キャンセル）
     * @param {{title?:string,message:string,okText?:string,cancelText?:string}} props - プロパティ
     */
    const ConfirmDialog = ({ title = '確認', message = '', okText = 'OK', cancelText = 'キャンセル', onResolve }) => {
        return React.createElement(BaseModal, {
            title,
            message,
            onClose: (reason) => onResolve && onResolve(false, reason),
            footer: (okRef) => [
                React.createElement('button', {
                    key: 'cancel',
                    className: 'px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600',
                    onClick: () => onResolve && onResolve(false)
                }, String(cancelText || 'キャンセル')),
                React.createElement('button', {
                    key: 'ok',
                    ref: okRef,
                    className: 'px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700',
                    onClick: () => onResolve && onResolve(true)
                }, String(okText || 'OK'))
            ]
        });
    };

    // 公開API（Promiseベース）
    window.UI = window.UI || {};
    window.UI.alert = ({ title = 'お知らせ', message = '', okText = 'OK' } = {}) => {
        return new Promise((resolve) => {
            const container = createContainer();
            const handleResolve = () => { destroyContainer(container); resolve(); };
            ReactDOM.render(React.createElement(AlertDialog, { title, message, okText, onResolve: handleResolve }), container);
        });
    };
    window.UI.confirm = ({ title = '確認', message = '', okText = 'OK', cancelText = 'キャンセル' } = {}) => {
        return new Promise((resolve) => {
            const container = createContainer();
            const handleResolve = (result) => { destroyContainer(container); resolve(!!result); };
            ReactDOM.render(React.createElement(ConfirmDialog, { title, message, okText, cancelText, onResolve: handleResolve }), container);
        });
    };

    return { AlertDialog, ConfirmDialog };
})();

// グローバル公開（必要に応じて利用）
window.Components = window.Components || {};
window.Components.UIDialogs = UIDialogs;


