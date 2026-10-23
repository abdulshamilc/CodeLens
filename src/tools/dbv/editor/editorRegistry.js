// src/tools/dbv/editor/editorRegistry.js
// Global registry for the active CodeMirror 6 EditorView instance.
// Enables atomic single-transaction document replacements and selection updates
// from outside React's render tree (e.g. loadExample, command palette) without
// destroying or recreating the editor.

let activeEditorView = null;

/**
 * Register the active EditorView instance.
 * @param {import("@codemirror/view").EditorView | null} view
 */
export function setEditorView(view) {
  activeEditorView = view;
}

/**
 * Get the currently active EditorView instance.
 * @returns {import("@codemirror/view").EditorView | null}
 */
export function getEditorView() {
  return activeEditorView;
}
