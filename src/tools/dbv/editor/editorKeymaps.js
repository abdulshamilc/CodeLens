// src/tools/dbv/editor/editorKeymaps.js
// VS Code-compatible keymap bindings for CodeMirror 6

import { keymap } from "@codemirror/view";
import {
  defaultKeymap,
  historyKeymap,
  indentWithTab,
  moveLineUp,
  moveLineDown,
  copyLineUp,
  copyLineDown,
  deleteLine,
  indentSelection,
  cursorLineStart,
  cursorLineEnd,
} from "@codemirror/commands";
import {
  searchKeymap,
  openSearchPanel,
  selectNextOccurrence,
  gotoLine,
} from "@codemirror/search";
import { toggleComment, toggleBlockComment } from "@codemirror/commands";

export function getVSCodeKeymap({ onRun, onVisualize, onFormat }) {
  const customBindings = [
    // Move lines up/down (Alt+ArrowUp/Down)
    { key: "Alt-ArrowUp", run: moveLineUp },
    { key: "Alt-ArrowDown", run: moveLineDown },

    // Copy lines up/down (Shift-Alt-ArrowUp/Down)
    { key: "Shift-Alt-ArrowUp", run: copyLineUp },
    { key: "Shift-Alt-ArrowDown", run: copyLineDown },

    // Delete line (Ctrl-Shift-K)
    { key: "Mod-Shift-k", run: deleteLine },

    // Line and block comments (Ctrl-/, Shift-Alt-A)
    { key: "Mod-/", run: toggleComment },
    { key: "Shift-Alt-a", run: toggleBlockComment },

    // Multi-cursor next occurrence (Ctrl-D)
    { key: "Mod-d", run: selectNextOccurrence, preventDefault: true },

    // Indent / dedent (Ctrl-], Ctrl-[)
    { key: "Mod-]", run: (view) => indentSelection(view) },
    { key: "Mod-[", run: (view) => {
        // Dedent selection or current line
        const { state, dispatch } = view;
        const changes = [];
        for (const range of state.selection.ranges) {
          const startLine = state.doc.lineAt(range.from).number;
          const endLine = state.doc.lineAt(range.to).number;
          for (let l = startLine; l <= endLine; l++) {
            const line = state.doc.line(l);
            const text = line.text;
            if (text.startsWith("  ")) {
              changes.push({ from: line.from, to: line.from + 2, insert: "" });
            } else if (text.startsWith("\t") || text.startsWith(" ")) {
              changes.push({ from: line.from, to: line.from + 1, insert: "" });
            }
          }
        }
        if (changes.length > 0) {
          dispatch({ changes });
          return true;
        }
        return false;
      }
    },

    // Search and navigation
    { key: "Mod-f", run: openSearchPanel },
    { key: "Mod-h", run: openSearchPanel },
    { key: "Mod-g", run: gotoLine },

    // Format Document (Shift-Alt-F)
    {
      key: "Shift-Alt-f",
      run: () => {
        if (onFormat) {
          onFormat();
          return true;
        }
        return false;
      },
    },

    // Execute run / visualize if triggered inside editor
    {
      key: "Mod-Enter",
      run: () => {
        if (onRun) {
          onRun();
          return true;
        }
        return false;
      },
    },
    {
      key: "Mod-Shift-Enter",
      run: () => {
        if (onVisualize) {
          onVisualize();
          return true;
        }
        return false;
      },
    },

    // Tab key indent/outdent
    indentWithTab,
  ];

  return keymap.of([
    ...customBindings,
    ...searchKeymap,
    ...defaultKeymap,
    ...historyKeymap,
  ]);
}
