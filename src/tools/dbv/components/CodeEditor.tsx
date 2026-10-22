// src/tools/dbv/components/CodeEditor.tsx
// CodeMirror 6 editor with JS syntax highlighting, executing-line gutter arrow,
// and clickable line numbers for breakpoints.

import React, { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, RangeSetBuilder, StateField, StateEffect } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { gutter, GutterMarker, Decoration } from "@codemirror/view";
import { useDBVStore } from "../store/useDBVStore";
import { useAppStore } from "../../../app/useAppStore";

// ─── State effects for highlighting ──────────────────────────────────────────
const setActiveLine = StateEffect.define<number | null>();
const activeLineField = StateField.define<number | null>({
  create: () => null,
  update: (val, tr) => {
    for (const e of tr.effects) if (e.is(setActiveLine)) return e.value;
    return val;
  },
});

const activeLineHighlight = EditorView.decorations.compute(
  [activeLineField],
  (state) => {
    const line = state.field(activeLineField);
    if (line === null || line < 1) return Decoration.none;
    const builder = new RangeSetBuilder<Decoration>();
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
  }
);

// ─── Breakpoint gutter marker ─────────────────────────────────────────────
class BreakpointMarker extends GutterMarker {
  toDOM() {
    const el = document.createElement("div");
    el.textContent = "●";
    el.style.color = "#ef4444";
    el.style.fontSize = "10px";
    el.style.lineHeight = "1.6";
    el.style.cursor = "pointer";
    el.title = "Remove breakpoint";
    return el;
  }
}

// ─── Light theme override ─────────────────────────────────────────────────
const lightTheme = EditorView.theme({
  "&": { backgroundColor: "#f8fafc", color: "#0f172a" },
  ".cm-content": { caretColor: "#6366f1" },
  ".cm-cursor": { borderLeftColor: "#6366f1" },
  ".cm-gutters": { backgroundColor: "#f1f5f9", borderRight: "1px solid #e2e8f0", color: "#94a3b8" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px" },
  ".cm-selectionBackground": { backgroundColor: "#c7d2fe" },
  "&.cm-focused .cm-selectionBackground": { backgroundColor: "#a5b4fc" },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-active-exec-line": { backgroundColor: "rgba(99,102,241,0.12)" },
}, { dark: false });

const darkTheme = EditorView.theme({
  ".cm-active-exec-line": { backgroundColor: "rgba(99,102,241,0.18)" },
}, { dark: true });

interface CodeEditorProps {
  className?: string;
  style?: React.CSSProperties;
}

export function CodeEditor({ className, style }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInternalChange = useRef(false);
  const { code, setCode, trace, currentStep, breakpoints, toggleBreakpoint } = useDBVStore();
  const { theme } = useAppStore();

  // Rebuild editor when theme changes
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        EditorView.lineWrapping,
        javascript(),
        theme === "dark" ? [oneDark, darkTheme] : lightTheme,
        activeLineField,
        activeLineHighlight,
        gutter({
          class: "cm-breakpoint-gutter",
          markers: (view) => {
            const builder = new RangeSetBuilder<GutterMarker>();
            for (const bpLine of Array.from(breakpoints).sort((a, b) => a - b)) {
              try {
                const line = view.state.doc.line(bpLine);
                builder.add(line.from, line.from, new BreakpointMarker());
              } catch { /* line out of range */ }
            }
            return builder.finish();
          },
          domEventHandlers: {
            mousedown: (view, line, _event) => {
              const lineNum = view.state.doc.lineAt(line.from).number;
              toggleBreakpoint(lineNum);
              return true;
            },
          },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            isInternalChange.current = true;
            setCode(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "13px",
            fontFamily: '"JetBrains Mono", monospace',
          },
          "&.cm-focused": {
            outline: "none",
          },
          ".cm-scroller": { overflow: "auto", fontFamily: "inherit" },
          ".cm-content": { minHeight: "100%", padding: "6px 0", wordBreak: "break-word", overflowWrap: "anywhere" },
          ".cm-line": { wordBreak: "break-word", overflowWrap: "anywhere" },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]); // Only recreate on theme change

  // Sync code from store to editor (when loading from IndexedDB, examples, or URL)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const current = view.state.doc.toString();
    if (current !== code) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: code },
      });
    }
  }, [code]);

  // Highlight the currently executing line
  useEffect(() => {
    const view = viewRef.current;
    if (!view || trace.length === 0) return;
    const step = trace[currentStep];
    const line = step?.nodeRange?.startLine ?? null;
    view.dispatch({ effects: setActiveLine.of(line) });
  }, [trace, currentStep]);

  // Sync breakpoints by redrawing gutter markers
  useEffect(() => {
    viewRef.current?.requestMeasure();
  }, [breakpoints]);

  return (
    <div
      ref={containerRef}
      className={`cursor-text ${className ?? ""}`}
      style={{
        height: "100%",
        overflow: "hidden",
        borderRadius: "8px",
        ...style,
      }}
      onClick={() => viewRef.current?.focus()}
      aria-label="JavaScript code editor"
    />
  );
}
