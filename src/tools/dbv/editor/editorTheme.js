// src/tools/dbv/editor/editorTheme.js
// VS Code-inspired theme extensions adhering to CodeLens theme tokens
// Provides active execution line decorations, runtime error squiggles & gutter, and selection styling.

import { EditorView, gutter, GutterMarker, Decoration } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { StateField, StateEffect, RangeSetBuilder, RangeSet } from "@codemirror/state";

// ─── Active Execution Line ───────────────────────────────────────────────────
export const setActiveLineEffect = StateEffect.define();

export const activeLineField = StateField.define({
  create: () => null,
  update: (val, tr) => {
    for (const e of tr.effects) {
      if (e.is(setActiveLineEffect)) {
        return e.value;
      }
    }
    return val;
  },
});

export const activeLineHighlight = EditorView.decorations.compute([activeLineField], (state) => {
  const line = state.field(activeLineField, false);
  if (line === null || line < 1 || line > state.doc.lines) {
    return Decoration.none;
  }
  const builder = new RangeSetBuilder();
  try {
    const lineObj = state.doc.line(line);
    builder.add(
      lineObj.from,
      lineObj.from,
      Decoration.line({ class: "cm-active-exec-line" })
    );
  } catch {
    // line out of range
  }
  return builder.finish();
});

// ─── Runtime Error Decorations & Gutter ──────────────────────────────────────
export const setErrorEffect = StateEffect.define();

export class ErrorGutterMarker extends GutterMarker {
  constructor(error) {
    super();
    this.error = error;
  }
  toDOM() {
    const el = document.createElement("div");
    el.className = "cm-error-gutter-dot";
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", "Runtime Error");
    const errMsg = typeof this.error === "object" && this.error
      ? `${this.error.name}: ${this.error.message}`
      : String(this.error || "Runtime Error");
    el.title = `Error: ${errMsg}`;
    el.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:auto">
        <circle cx="6" cy="6" r="5" fill="#ef4444" stroke="#7f1d1d" stroke-width="1"/>
        <path d="M4 4L8 8M8 4L4 8" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
    `;
    return el;
  }
}

export const errorLineField = StateField.define({
  create: () => null,
  update: (val, tr) => {
    for (const e of tr.effects) {
      if (e.is(setErrorEffect)) {
        return e.value;
      }
    }
    return val;
  },
});

export const errorDecorations = EditorView.decorations.compute([errorLineField], (state) => {
  const err = state.field(errorLineField, false);
  if (!err || !err.line || err.line < 1 || err.line > state.doc.lines) {
    return Decoration.none;
  }
  const builder = new RangeSetBuilder();
  try {
    const lineObj = state.doc.line(err.line);
    // Line highlight
    builder.add(
      lineObj.from,
      lineObj.from,
      Decoration.line({ class: "cm-runtime-error-line" })
    );

    // Squiggle under exact expression range
    const startCol = Math.max(1, err.column || 1);
    const fromPos = Math.min(lineObj.from + (startCol - 1), lineObj.to);
    let toPos = lineObj.to;
    if (err.endLine === err.line && err.endColumn) {
      toPos = Math.min(lineObj.from + (err.endColumn - 1), lineObj.to);
    }
    if (toPos <= fromPos) {
      toPos = Math.min(fromPos + 1, lineObj.to);
    }
    if (fromPos < toPos) {
      builder.add(
        fromPos,
        toPos,
        Decoration.mark({ class: "cm-runtime-error-squiggle" })
      );
    }
  } catch {
    // range error fallback
  }
  return builder.finish();
});

export function createErrorGutter(onJump) {
  return gutter({
    class: "cm-error-gutter",
    markers: (view) => {
      const err = view.state.field(errorLineField, false);
      if (!err || !err.line || err.line < 1 || err.line > view.state.doc.lines) {
        return RangeSet.empty;
      }
      const builder = new RangeSetBuilder();
      try {
        const lineObj = view.state.doc.line(err.line);
        builder.add(lineObj.from, lineObj.from, new ErrorGutterMarker(err));
      } catch {
        return RangeSet.empty;
      }
      return builder.finish();
    },
    domEventHandlers: {
      mousedown: (view, line) => {
        const lineNum = view.state.doc.lineAt(line.from).number;
        onJump?.(lineNum);
        return true;
      },
    },
  });
}

// ─── Base Editor Styles ──────────────────────────────────────────────────────
export const baseEditorStyles = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    fontFamily: '"JetBrains Mono", Consolas, Menlo, Monaco, monospace',
    outline: "none",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "inherit",
    lineHeight: "1.65",
  },
  ".cm-content": {
    minHeight: "100%",
    padding: "8px 0",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  ".cm-line": {
    padding: "0 8px",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  ".cm-gutters": {
    userSelect: "none",
    borderRight: "1px solid rgba(var(--color-border), 0.6)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 8px 0 16px",
    minWidth: "40px",
    textAlign: "right",
    cursor: "pointer",
  },
  ".cm-breakpoint-gutter": {
    width: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ".cm-breakpoint-dot": {
    cursor: "pointer",
    lineHeight: "1",
    transition: "transform 0.15s ease",
  },
  ".cm-breakpoint-dot:hover": {
    transform: "scale(1.2)",
  },
  ".cm-error-gutter": {
    width: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ".cm-error-gutter-dot": {
    cursor: "pointer",
    lineHeight: "1",
    transition: "transform 0.15s ease",
  },
  ".cm-error-gutter-dot:hover": {
    transform: "scale(1.2)",
  },
  ".cm-foldGutter": {
    width: "14px",
    textAlign: "center",
  },
  ".cm-active-exec-line": {
    position: "relative",
    backgroundColor: "rgba(99, 102, 241, 0.18) !important",
    boxShadow: "inset 3px 0 0 0 rgb(99, 102, 241)",
  },
  ".cm-runtime-error-line": {
    position: "relative",
    backgroundColor: "rgba(239, 68, 68, 0.14) !important",
    boxShadow: "inset 3px 0 0 0 rgb(239, 68, 68)",
  },
  ".cm-runtime-error-squiggle": {
    textDecoration: "underline wavy #ef4444 !important",
    textDecorationSkipInk: "none",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: "2px",
  },
  // Ensure select-all highlight is crisp and visible across all lines
  ".cm-selectionBackground": {
    backgroundColor: "rgba(99, 102, 241, 0.35) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(99, 102, 241, 0.45) !important",
  },
  "::selection": {
    backgroundColor: "rgba(99, 102, 241, 0.45) !important",
  },
  // Custom scrollbars
  ".cm-scroller::-webkit-scrollbar": {
    width: "8px",
    height: "8px",
  },
  ".cm-scroller::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(148, 163, 184, 0.25)",
    borderRadius: "4px",
  },
  ".cm-scroller::-webkit-scrollbar-thumb:hover": {
    backgroundColor: "rgba(148, 163, 184, 0.45)",
  },
});

export const codeLensDarkTheme = EditorView.theme({
  "&": {
    backgroundColor: "rgb(var(--color-bg))",
    color: "#e2e8f0",
  },
  ".cm-gutters": {
    backgroundColor: "rgba(var(--color-bg), 0.95)",
    color: "#64748b",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    color: "#cbd5e1",
  },
  ".cm-selectionBackground": {
    backgroundColor: "rgba(99, 102, 241, 0.35) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(99, 102, 241, 0.45) !important",
  },
  ".cm-selectionMatch": {
    backgroundColor: "rgba(99, 102, 241, 0.25)",
    outline: "1px solid rgba(99, 102, 241, 0.45)",
  },
  ".cm-cursor": {
    borderLeftColor: "#818cf8",
    borderLeftWidth: "2px",
  },
  ".cm-searchMatch": {
    backgroundColor: "rgba(234, 179, 8, 0.3)",
    outline: "1px solid rgba(234, 179, 8, 0.6)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "rgba(249, 115, 22, 0.5)",
  },
}, { dark: true });

export const codeLensLightTheme = EditorView.theme({
  "&": {
    backgroundColor: "#ffffff",
    color: "#0f172a",
  },
  ".cm-gutters": {
    backgroundColor: "#f8fafc",
    color: "#94a3b8",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(241, 245, 249, 0.7)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#f1f5f9",
    color: "#334155",
  },
  ".cm-selectionBackground": {
    backgroundColor: "#c7d2fe !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "#a5b4fc !important",
  },
  ".cm-selectionMatch": {
    backgroundColor: "rgba(165, 180, 252, 0.35)",
    outline: "1px solid rgba(99, 102, 241, 0.4)",
  },
  ".cm-cursor": {
    borderLeftColor: "#4f46e5",
    borderLeftWidth: "2px",
  },
  ".cm-active-exec-line": {
    backgroundColor: "rgba(99, 102, 241, 0.12) !important",
    boxShadow: "inset 3px 0 0 0 #4f46e5",
  },
  ".cm-searchMatch": {
    backgroundColor: "rgba(254, 240, 138, 0.7)",
    outline: "1px solid rgba(202, 138, 4, 0.6)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "rgba(253, 186, 116, 0.8)",
  },
}, { dark: false });

export function getEditorThemeExtensions(theme) {
  if (theme === "dark") {
    return [oneDark, codeLensDarkTheme];
  }
  return [codeLensLightTheme];
}
