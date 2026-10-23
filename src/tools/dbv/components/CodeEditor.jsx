// src/tools/dbv/components/CodeEditor.jsx
// VS Code-style CodeMirror 6 editor with single-instance lifecycle, Compartments,
// breakpoint gutter, execution highlight, search, chrome tab bar, and status bar.

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { EditorView, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, rectangularSelection, crosshairCursor } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { indentUnit, foldGutter, bracketMatching, indentOnInput } from "@codemirror/language";
import { closeBrackets } from "@codemirror/autocomplete";
import { highlightSelectionMatches } from "@codemirror/search";
import { showMinimap } from "@replit/codemirror-minimap";

import { useDBVStore } from "../store/useDBVStore";
import { useAppStore } from "../../../app/useAppStore";
import { useEditorSettings } from "../editor/editorSettings";
import { baseEditorStyles, getEditorThemeExtensions, activeLineField, activeLineHighlight, setActiveLineEffect, errorLineField, errorDecorations, createErrorGutter, setErrorEffect } from "../editor/editorTheme";
import { breakpointField, setBreakpointsEffect, createBreakpointGutter } from "../editor/editorBreakpoints";
import { getVSCodeKeymap } from "../editor/editorKeymaps";
import { EditorChrome } from "./editor/EditorChrome";
import { formatCode } from "../editor/formatCode";
import { createAutocompleteExtension } from "../editor/editorAutocomplete";
import { createHoverExtension } from "../editor/editorHover";
import { createEditorLinter } from "../editor/editorLinter";
import { setEditorView } from "../editor/editorRegistry";

export function CodeEditor({ className, style, onRun, onVisualize, onOpenProblems }) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const isInternalChange = useRef(false);

  const {
    code,
    setCode,
    trace,
    currentStep,
    breakpoints,
    toggleBreakpoint,
    diagnostics,
    setDiagnostics,
    jumpTarget,
    jumpToPosition,
    runError,
    setUserEditedSinceLoad,
  } = useDBVStore();
  const { theme } = useAppStore();
  const [settings, updateSettings] = useEditorSettings();

  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [selectionCount, setSelectionCount] = useState(0);

  // Compartments for runtime reconfigurations without destroying the editor instance
  const compartments = useMemo(() => ({
    theme: new Compartment(),
    fontSize: new Compartment(),
    tabSize: new Compartment(),
    lineWrapping: new Compartment(),
    lineNumbers: new Compartment(),
    bracketMatching: new Compartment(),
    minimap: new Compartment(),
    keymap: new Compartment(),
  }), []);

  // Format code handler (Shift+Alt+F)
  const handleFormat = useCallback(async () => {
    const view = viewRef.current;
    if (!view) return;
    const currentText = view.state.doc.toString();
    const formatted = await formatCode(currentText, settings.tabSize);
    if (formatted && formatted !== currentText) {
      view.dispatch({
        changes: { from: 0, to: currentText.length, insert: formatted },
      });
      setCode(formatted);
    }
  }, [settings.tabSize, setCode]);

  // Create Editor instance ONCE on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const initialKeymap = getVSCodeKeymap({
      onRun,
      onVisualize,
      onFormat: handleFormat,
    });

    const startState = EditorState.create({
      doc: code,
      extensions: [
        // Core editing extensions
        baseEditorStyles,
        drawSelection(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        highlightSelectionMatches(),
        foldGutter(),
        indentOnInput(),
        closeBrackets(),
        javascript(),

        // IntelliSense: Autocomplete, Hover cards, and Diagnostics / Squiggles
        createAutocompleteExtension(),
        createHoverExtension(),
        ...createEditorLinter((diags) => setDiagnostics(diags)),

        // Dynamic compartments
        compartments.theme.of(getEditorThemeExtensions(theme)),
        compartments.fontSize.of(
          EditorView.theme({ "&": { fontSize: `${settings.fontSize}px` } })
        ),
        compartments.tabSize.of(
          EditorState.tabSize.of(settings.tabSize),
          indentUnit.of(" ".repeat(settings.tabSize))
        ),
        compartments.lineWrapping.of(settings.wordWrap ? EditorView.lineWrapping : []),
        compartments.lineNumbers.of(settings.lineNumbers ? lineNumbers() : []),
        compartments.bracketMatching.of(settings.bracketMatching ? bracketMatching() : []),
        compartments.minimap.of(
          settings.minimap
            ? showMinimap.compute(["doc"], () => ({
                create: () => ({ dom: document.createElement("div") }),
              }))
            : []
        ),
        compartments.keymap.of(initialKeymap),

        // Execution line highlight field
        activeLineField,
        activeLineHighlight,

        // Runtime error decorations & gutter
        errorLineField,
        errorDecorations,
        createErrorGutter((lineNum) => {
          jumpToPosition({ line: lineNum, col: 1, ts: Date.now() });
        }),

        // Breakpoints field and gutter
        breakpointField,
        createBreakpointGutter((lineNum) => {
          toggleBreakpoint(lineNum);
        }),

        // Document change & cursor tracking listener
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            isInternalChange.current = true;
            setCode(update.state.doc.toString());
            setUserEditedSinceLoad(true);
          }

          if (update.selectionSet || update.docChanged) {
            const mainSel = update.state.selection.main;
            const line = update.state.doc.lineAt(mainSel.head);
            setCursorPos({
              line: line.number,
              col: mainSel.head - line.from + 1,
            });
            const selLen = Math.abs(mainSel.to - mainSel.from);
            setSelectionCount(selLen);
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });
    viewRef.current = view;
    setEditorView(view);

    // Initialize breakpoints in StateField
    if (breakpoints.size > 0) {
      view.dispatch({ effects: setBreakpointsEffect.of(Array.from(breakpoints)) });
    }

    return () => {
      setEditorView(null);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run ONLY once on mount

  // Reconfigure Theme Compartment (instant toggle, zero cursor jump)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: compartments.theme.reconfigure(getEditorThemeExtensions(theme)),
    });
  }, [theme, compartments.theme]);

  // Reconfigure Font Size Compartment
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: compartments.fontSize.reconfigure(
        EditorView.theme({ "&": { fontSize: `${settings.fontSize}px` } })
      ),
    });
  }, [settings.fontSize, compartments.fontSize]);

  // Reconfigure Tab Size Compartment
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: compartments.tabSize.reconfigure([
        EditorState.tabSize.of(settings.tabSize),
        indentUnit.of(" ".repeat(settings.tabSize)),
      ]),
    });
  }, [settings.tabSize, compartments.tabSize]);

  // Reconfigure Line Wrapping Compartment
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: compartments.lineWrapping.reconfigure(
        settings.wordWrap ? EditorView.lineWrapping : []
      ),
    });
  }, [settings.wordWrap, compartments.lineWrapping]);

  // Reconfigure Line Numbers Compartment
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: compartments.lineNumbers.reconfigure(
        settings.lineNumbers ? lineNumbers() : []
      ),
    });
  }, [settings.lineNumbers, compartments.lineNumbers]);

  // Reconfigure Bracket Matching Compartment
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: compartments.bracketMatching.reconfigure(
        settings.bracketMatching ? bracketMatching() : []
      ),
    });
  }, [settings.bracketMatching, compartments.bracketMatching]);

  // Reconfigure Minimap Compartment
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: compartments.minimap.reconfigure(
        settings.minimap
          ? showMinimap.compute(["doc"], () => ({
              create: () => ({ dom: document.createElement("div") }),
            }))
          : []
      ),
    });
  }, [settings.minimap, compartments.minimap]);

  // Reconfigure Keymap Compartment when action callbacks update
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const newKeymap = getVSCodeKeymap({
      onRun,
      onVisualize,
      onFormat: handleFormat,
    });
    view.dispatch({
      effects: compartments.keymap.reconfigure(newKeymap),
    });
  }, [onRun, onVisualize, handleFormat, compartments.keymap]);

  // Sync external code changes (loading examples, IndexedDB restore, URL param)
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
    if (!view) return;
    if (trace.length === 0) {
      view.dispatch({ effects: setActiveLineEffect.of(null) });
      return;
    }
    const step = trace[currentStep];
    const line = step?.nodeRange?.startLine ?? null;
    view.dispatch({ effects: setActiveLineEffect.of(line) });
  }, [trace, currentStep]);

  // Sync Breakpoints to StateField
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: setBreakpointsEffect.of(Array.from(breakpoints)),
    });
  }, [breakpoints]);

  // Sync Runtime Error to errorLineField
  const currentStepObj = trace[currentStep];
  const stepError = currentStepObj?.error;
  const currentError = stepError || (runError && typeof runError === "object" ? runError : null);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: setErrorEffect.of(currentError),
    });
  }, [currentError]);

  // Handle jumpToPosition (e.g. clicking a problem in the Problems tab)
  useEffect(() => {
    if (!jumpTarget || !viewRef.current) return;
    const view = viewRef.current;
    const { line, col } = jumpTarget;
    try {
      const targetLine = Math.max(1, Math.min(line || 1, view.state.doc.lines));
      const lineObj = view.state.doc.line(targetLine);
      const targetCol = Math.max(1, col || 1);
      const pos = Math.min(lineObj.from + (targetCol - 1), lineObj.to);

      view.dispatch({
        selection: { anchor: pos, head: pos },
        scrollIntoView: true,
      });
      view.focus();
    } catch {
      // Ignore boundary errors
    }
  }, [jumpTarget]);

  return (
    <EditorChrome
      fileName="main.js"
      cursorPos={cursorPos}
      selectionCount={selectionCount}
      breakpointCount={breakpoints.size}
      problemCount={diagnostics.length}
      settings={settings}
      onUpdateSettings={updateSettings}
      onFormat={handleFormat}
      onOpenProblems={onOpenProblems}
    >
      <div
        ref={containerRef}
        className={`w-full h-full cursor-text ${className ?? ""}`}
        style={style}
        onClick={() => viewRef.current?.focus()}
        aria-label="JavaScript Code Editor"
      />
    </EditorChrome>
  );
}
