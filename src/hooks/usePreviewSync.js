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
  const previewValueRef = useRef('');

  // preview の現在値を参照用に保持
  useEffect(() => {
    previewValueRef.current = preview;
  }, [preview]);

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
   * @type {(text:string, cursorLineIndex?:number)=>void}
   */
  const debouncedPreviewSync = useMemo(
    () => Helpers.debounce((editedPreview, cursorLineIndex) => {
      // セグメント/変数を同期更新（カーソルは handlePreviewChange で保存済み）
      const result = Helpers.updateSegmentsAndVariablesFromPreview(
        editedPreview,
        variables,
        segments,
        cursorLineIndex
      );

      setVariables(result.variables);
      setSegments(result.segments);

      // 編集フラグ解除
      setIsEditingPreview(false);

      // カーソル復元
      setTimeout(restoreCursorPosition, 0);
    }, 300),
    [variables, segments, restoreCursorPosition]
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
    // カーソル位置（変更後）を先に保存（即時プレビュー更新で末尾へ飛ぶのを防ぐ）
    let caret = 0;
    try {
      const ta = previewRef && previewRef.current;
      if (ta && typeof ta.selectionStart === 'number') {
        caret = Math.max(0, Math.min(ta.selectionStart, editedPreview.length));
        cursorPositionRef.current = { start: caret, end: caret };
      }
    } catch (_) {}

    // 直前テキスト
    const oldPreview = String(previewValueRef.current || '');
    const newPreview = String(editedPreview || '');

    // 単純操作の検出
    const diffLen = newPreview.length - oldPreview.length;
    const tryApplySimpleStructuralEdit = () => {
      // Enter 挿入（+1, 直前が\n）
      if (diffLen === 1 && newPreview[caret - 1] === '\n') {
        const leftOk = oldPreview.slice(0, caret - 1) === newPreview.slice(0, caret - 1);
        const rightOk = oldPreview.slice(caret - 1) === newPreview.slice(caret);
        if (leftOk && rightOk) {
          // 旧テキスト上の分割位置
          const splitPos = caret - 1;
          const lineIdx = oldPreview.slice(0, splitPos).split('\n').length - 1;
          const col = splitPos - (oldPreview.lastIndexOf('\n', splitPos - 1) + 1);
          const rendered = Helpers.renderPreviewWithIndexMap(segments, variables);
          const nextSegments = Helpers.applyEnterAt(segments, variables, lineIdx, col, rendered.lineMaps);
          setIsEditingPreview(true);
          setSegments(nextSegments);
          if (typeof saveToUndoStack === 'function') saveToUndoStack();
          // preview は useEffect 側で再生成
          setIsEditingPreview(false);
          // カーソル復元（構造編集は同フレーム内で復元）
          cursorPositionRef.current = { start: caret, end: caret };
          setTimeout(restoreCursorPosition, 0);
          return true;
        }
      }

      // Backspace による改行削除（-1, 削除されたのが旧テキストの caret 位置 - 1）
      if (diffLen === -1) {
        const removedAtBackspace = (idx) => (
          oldPreview[idx] === '\n' &&
          oldPreview.slice(0, idx) === newPreview.slice(0, idx) &&
          oldPreview.slice(idx + 1) === newPreview.slice(idx)
        );

        // backspace: caret は削除後位置。削除前は caret+1 位置だった可能性
        if (removedAtBackspace(caret)) {
          // Delete（行末で次行の改行を削除）相当
          const lineIdx = oldPreview.slice(0, caret).split('\n').length - 1;
          const nextSegments = Helpers.applyDeleteAtLineEnd(segments, lineIdx);
          setIsEditingPreview(true);
          setSegments(nextSegments);
          if (typeof saveToUndoStack === 'function') saveToUndoStack();
          setIsEditingPreview(false);
          cursorPositionRef.current = { start: caret, end: caret };
          setTimeout(restoreCursorPosition, 0);
          return true;
        }

        const removedAtBackspacePrev = (idx) => (
          oldPreview[idx - 1] === '\n' &&
          oldPreview.slice(0, idx - 1) === newPreview.slice(0, idx - 1) &&
          oldPreview.slice(idx) === newPreview.slice(idx)
        );

        if (removedAtBackspacePrev(caret)) {
          // Backspace（行頭）: 前行と結合
          const removedPos = caret - 1;
          const currLineIdx = oldPreview.slice(0, removedPos).split('\n').length; // 削除された改行の直後の行
          const nextSegments = Helpers.applyBackspaceAtLineStart(segments, currLineIdx);
          setIsEditingPreview(true);
          setSegments(nextSegments);
          if (typeof saveToUndoStack === 'function') saveToUndoStack();
          setIsEditingPreview(false);
          cursorPositionRef.current = { start: caret, end: caret };
          setTimeout(restoreCursorPosition, 0);
          return true;
        }
      }
      return false;
    };

    if (tryApplySimpleStructuralEdit()) {
      // ここではプレビュー文字列は useEffect に任せる
      return;
    }
    // カーソルの行番号を推定（挿入位置の精度向上）
    let cursorLineIndex;
    try {
      const ta = previewRef && previewRef.current;
      if (ta && typeof ta.selectionStart === 'number') {
        const caret = ta.selectionStart;
        const safeCaret = Math.max(0, Math.min(caret, editedPreview.length));
        cursorLineIndex = editedPreview.slice(0, safeCaret).split('\n').length - 1;
      }
    } catch (_) {}

    setIsEditingPreview(true);
    setPreviewImmediate(editedPreview);
    if (typeof saveToUndoStack === 'function') {
      saveToUndoStack();
    }
    debouncedPreviewSync(editedPreview, cursorLineIndex);
  }, [debouncedPreviewSync, saveToUndoStack, previewRef]);

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


