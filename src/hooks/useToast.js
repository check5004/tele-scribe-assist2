/**
 * トースト通知フック
 * 一時的な通知メッセージの表示状態と自動クローズを管理する。
 *
 * 戻り値:
 * - toastState: { visible:boolean, message:string }
 * - showToast(message:string, durationMs?:number): void
 */
const useToast = () => {
  const { useState, useCallback, useRef } = React;
  const [toastState, setToastState] = useState({ visible: false, message: '' });
  const timerRef = useRef(null);

  const showToast = useCallback((message, durationMs = 1800) => {
    try {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    } catch (_) {}
    setToastState({ visible: true, message });
    timerRef.current = setTimeout(() => {
      setToastState({ visible: false, message: '' });
      timerRef.current = null;
    }, durationMs);
  }, []);

  return { toastState, showToast };
};

// グローバル公開
window.Hooks = window.Hooks || {};
window.Hooks.useToast = useToast;


