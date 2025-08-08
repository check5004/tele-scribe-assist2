/**
 * プレビュー編集同期フック
 * プレビュー編集時の循環更新防止、カーソル位置の保存/復元、
 * セグメント/変数の同期更新（デバウンス300ms）を一元管理するカスタムフック
 *
 * 主な機能:
 * - isEditingPreview フラグの管理
 * - preview テキストの生成と編集反映
 * - カーソル位置の保存/復元
 * - Helpers.updateSegmentsAndVariablesFromPreview を用いた同期待機処理
 *
 * 使用方法:
 * const previewSync = Hooks.usePreviewSync({
 *   variables, segments, setVariables, setSegments, saveToUndoStack
 * });
 * const { preview, setPreviewImmediate, isEditingPreview, previewRef, handlePreviewChange } = previewSync;
 *
 * @param {Object} params - パラメータオブジェクト
 * @param {Array} params.variables - 現在の変数配列
 * @param {Array} params.segments - 現在のセグメント配列
 * @param {Function} params.setVariables - 変数更新関数
 * @param {Function} params.setSegments - セグメント更新関数
 * @param {Function} params.saveToUndoStack - Undoスタック保存関数
 * @returns {Object} プレビュー同期に関する状態とハンドラ
 */
const usePreviewSync = (params) => {
  const { useState, useEffect, useCallback, useRef, useMemo } = React;
  const {
    variables,
    segments,
    setVariables,
    setSegments,
    saveToUndoStack
  } = params;

  const [preview, setPreview] = useState('');
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const previewRef = useRef(null);
  const cursorPositionRef = useRef({ start: 0, end: 0 });

  /**
   * カーソル位置を保存
   * @returns {void}
   */
  const saveCursorPosition = useCallback(() => {
    if (previewRef.current) {
      const textarea = previewRef.current;
      cursorPositionRef.current = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      };
    }
  }, []);

  /**
   * カーソル位置を復元
   * @returns {void}
   */
  const restoreCursorPosition = useCallback(() => {
    if (previewRef.current) {
      const textarea = previewRef.current;
      const { start, end } = cursorPositionRef.current;
      requestAnimationFrame(() => {
        textarea.setSelectionRange(start, end);
        textarea.focus();
      });
    }
  }, []);

  /**
   * プレビューの自動生成
   * 変数/セグメント変更時に、自動的にプレビュー文字列を再生成
   */
  useEffect(() => {
    if (!isEditingPreview) {
      const text = segments.map((segment) => {
        let content = segment.content;
        variables.forEach((variable) => {
          const regex = new RegExp(`{{${variable.name}}}`, 'g');
          content = content.replace(regex, variable.value || `{{${variable.name}}}`);
        });
        return content;
      }).join('\n');
      setPreview(text);
    }
  }, [segments, variables, isEditingPreview]);

  /**
   * デバウンス同期（300ms）
   * @type {(text:string)=>void}
   */
  const debouncedPreviewSync = useMemo(
    () => Helpers.debounce((editedPreview) => {
      // カーソル位置保存
      saveCursorPosition();

      // セグメント/変数を同期更新
      const result = Helpers.updateSegmentsAndVariablesFromPreview(
        editedPreview,
        variables,
        segments
      );

      setVariables(result.variables);
      setSegments(result.segments);

      // 編集フラグ解除
      setIsEditingPreview(false);

      // カーソル復元
      setTimeout(restoreCursorPosition, 0);
    }, 300),
    [variables, segments, saveCursorPosition, restoreCursorPosition]
  );

  /**
   * 即時プレビュー設定（ユーザー入力の即時反映用）
   * @param {string} text - 新しいプレビューテキスト
   */
  const setPreviewImmediate = useCallback((text) => setPreview(text), []);

  /**
   * テキストエリア onChange ハンドラ
   * 循環更新を避けながら、Undo保存とデバウンス同期を行う
   * @param {string} editedPreview - 編集後テキスト
   */
  const handlePreviewChange = useCallback((editedPreview) => {
    setIsEditingPreview(true);
    setPreviewImmediate(editedPreview);
    if (typeof saveToUndoStack === 'function') {
      saveToUndoStack();
    }
    debouncedPreviewSync(editedPreview);
  }, [debouncedPreviewSync, saveToUndoStack]);

  return {
    preview,
    setPreviewImmediate,
    isEditingPreview,
    setIsEditingPreview,
    previewRef,
    handlePreviewChange
  };
};

/**
 * グローバル公開
 */
window.Hooks = window.Hooks || {};
window.Hooks.usePreviewSync = usePreviewSync;


