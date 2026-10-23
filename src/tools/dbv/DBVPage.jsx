// src/tools/dbv/DBVPage.jsx
// Complete 3-zone resizable layout for DBV:
// 1. CODE zone (left) | (2. VISUALIZATION zone (top-right) / 3. CONSOLE zone (bottom-right))
// Features dual execution modes: "Run" (Native sandboxed Web Worker, 5s timeout, loop protection)
// and "Visualize" (AST step-by-step trace generator with call stack, heap, scope chains).

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Group, Panel } from "react-resizable-panels";
import LZString from "lz-string";
import { useDBVStore } from "./store/useDBVStore";
import { useDBVLayoutStore } from "./store/useDBVLayoutStore";
import { CodeEditor } from "./components/CodeEditor";
import { VisualizationZone } from "./components/stage/VisualizationZone";
import { ConsoleZone } from "./components/stage/ConsoleZone";
import { ResizeHandle } from "./components/layout/ResizeHandle";
import { LayoutMenu } from "./components/layout/LayoutMenu";
import { ExamplesDrawer } from "./components/ExamplesDrawer";
import { Button, Slider, Tabs } from "../../shared/ui";
import { executeNativeScript } from "./engine/nativeRunner";
import { CommandPalette } from "./components/editor/CommandPalette";
import { formatCode } from "./editor/formatCode";
import { EXAMPLES } from "./examples/examples.js";
import { registerActiveRunner, cancelAllRunning } from "./engine/exampleLoader";
import { runSelfTest } from "./engine/selfTest";

export function DBVPage() {
  const {
    code,
    setCode,
    trace,
    setTrace,
    currentStep,
    setCurrentStep,
    stepForward,
    stepBack,
    isRunning,
    runError,
    setIsRunning,
    setRunError,
    loadSession,
    saveSession,
    jumpToPosition,
  } = useDBVStore();

  const {
    sizes,
    setSizes,
    visibleZones,
    toggleZoneVisibility,
    maximizedZone,
    toggleMaximize,
    restoreMaximized,
  } = useDBVLayoutStore();

  const workerRef = useRef(null);
  const nativeRunnerRef = useRef(null);

  const [showExamples, setShowExamples] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [selectedCtxId, setSelectedCtxId] = useState(null);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [narrowTab, setNarrowTab] = useState("visualization");

  // Console active tab: "live" | "run" | "problems"
  const [consoleTab, setConsoleTab] = useState("live");
  const [nativeLogs, setNativeLogs] = useState([]);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Track screen width for narrow tab mode (< 900px)
  useEffect(() => {
    const checkWidth = () => {
      setIsNarrowScreen(window.innerWidth < 900);
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // Set document title
  useEffect(() => {
    document.title = "DBV – JS Visualizer & Runner | CodeLens";
  }, []);

  // Debounced auto-save session
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveSession(), 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [code, saveSession]);

  // Stop / Terminate running tasks
  const stopExecution = useCallback(() => {
    if (nativeRunnerRef.current) {
      try { nativeRunnerRef.current.terminate(); } catch {}
      nativeRunnerRef.current = null;
    }
    if (workerRef.current) {
      try { workerRef.current.terminate(); } catch {}
      workerRef.current = null;
    }
    cancelAllRunning();
    setIsRunning(false);
  }, [setIsRunning]);

  // Terminate workers on unmount
  useEffect(() => {
    return () => {
      stopExecution();
    };
  }, [stopExecution]);

  // 1. RUN MODE: Native sandboxed Web Worker execution (standard JS, fast, async/await, mock fetch)
  const runNative = useCallback(
    (codeOrEvent) => {
      const currentCode =
        typeof codeOrEvent === "string" ? codeOrEvent : useDBVStore.getState().code;

      if (!currentCode || !currentCode.trim()) {
        stopExecution();
        setRunError("Editor is empty. Enter some JavaScript code and press Run or Visualize.");
        setNativeLogs([]);
        setIsRunning(false);
        return;
      }

      stopExecution();

      useDBVStore.getState().bumpRunId();
      const thisRunId = useDBVStore.getState().runId;

      setIsRunning(true);
      setRunError(null);
      setNativeLogs([]);
      setConsoleTab("run");

      const runner = executeNativeScript(currentCode, {
        onLogs: (newItems) => {
          if (useDBVStore.getState().runId === thisRunId) {
            setNativeLogs((prev) => [...prev, ...newItems]);
          }
        },
        onClear: () => {
          if (useDBVStore.getState().runId === thisRunId) {
            setNativeLogs([]);
          }
        },
        onDone: () => {
          if (useDBVStore.getState().runId === thisRunId) {
            setIsRunning(false);
            nativeRunnerRef.current = null;
          }
        },
        onError: (err) => {
          if (useDBVStore.getState().runId === thisRunId) {
            setRunError(err.message || "Runtime Error");
            setIsRunning(false);
            nativeRunnerRef.current = null;
          }
        },
        onTimeout: (msg) => {
          if (useDBVStore.getState().runId === thisRunId) {
            setRunError(msg);
            setIsRunning(false);
            nativeRunnerRef.current = null;
          }
        },
      });
      nativeRunnerRef.current = runner;
      registerActiveRunner({ nativeRunner: runner });
    },
    [stopExecution, setIsRunning, setRunError]
  );

  // 2. VISUALIZE MODE: AST Step-by-Step Trace Generator (Memory, Scope Chain, Call Stack)
  const visualizeAST = useCallback(
    (codeOrEvent) => {
      const currentCode =
        typeof codeOrEvent === "string" ? codeOrEvent : useDBVStore.getState().code;

      if (!currentCode || !currentCode.trim()) {
        stopExecution();
        setRunError("Editor is empty. Enter some JavaScript code and press Run or Visualize.");
        setTrace([]);
        setIsRunning(false);
        return;
      }

      stopExecution();

      // Atomically bump runId, clear trace/error, set isRunning: true
      useDBVStore.getState().startRun();
      const thisRunId = useDBVStore.getState().runId;

      setConsoleTab("live");

      const worker = new Worker(
        new URL("./engine/interpreter.worker.js", import.meta.url),
        { type: "module" }
      );

      workerRef.current = worker;
      registerActiveRunner({ visualizerWorker: worker });

      worker.onmessage = (e) => {
        const msg = e.data;
        if (useDBVStore.getState().runId !== thisRunId || (msg.runId !== undefined && msg.runId !== thisRunId)) {
          // Stale response discarded! Clean up worker and release active ref safely
          try { worker.terminate(); } catch {}
          if (workerRef.current === worker) {
            workerRef.current = null;
            setIsRunning(false);
          }
          return;
        }

        if (msg.type === "trace") {
          setTrace(msg.steps);
          if (msg.error) {
            setRunError(msg.error);
          } else {
            setRunError(null);
          }
          setIsRunning(false);
          try { worker.terminate(); } catch {}
          if (workerRef.current === worker) workerRef.current = null;
        } else if (msg.type === "error") {
          setRunError(msg.error || msg.message);
          setIsRunning(false);
          try { worker.terminate(); } catch {}
          if (workerRef.current === worker) workerRef.current = null;
        } else if (msg.type === "parse-error") {
          setRunError({
            name: "SyntaxError",
            message: msg.message || "Parse error",
            kind: "parse",
            stack: [],
            line: msg.line || 1,
            column: msg.column || 1,
            sourceSnippet: "",
          });
          setIsRunning(false);
          try { worker.terminate(); } catch {}
          if (workerRef.current === worker) workerRef.current = null;
        }
      };

      worker.onerror = (e) => {
        if (useDBVStore.getState().runId === thisRunId) {
          setRunError({
            name: "WorkerError",
            message: e?.message || "Visualizer Worker encountered an error",
            kind: "runtime",
            stack: [],
            line: 1,
            column: 1,
            sourceSnippet: "",
          });
          setIsRunning(false);
        }
        try { worker.terminate(); } catch {}
        if (workerRef.current === worker) workerRef.current = null;
      };

      const msg = { type: "run", code: currentCode, stepLimit: 20_000, runId: thisRunId };
      worker.postMessage(msg);

      // Safety timeout: 15s limit
      setTimeout(() => {
        if (workerRef.current === worker && useDBVStore.getState().runId === thisRunId) {
          try { worker.terminate(); } catch {}
          workerRef.current = null;
          setRunError({
            name: "TimeoutError",
            message: "Visualization timed out (15s limit). Check for infinite loops.",
            kind: "step_limit",
            stack: [],
            line: 1,
            column: 1,
            sourceSnippet: "",
          });
          setIsRunning(false);
        }
      }, 15_000);
    },
    [stopExecution, setTrace, setIsRunning, setRunError]
  );

  // Initial mount: load URL param (?example= or ?code=) or session, and auto-visualize once to populate Step 1
  useEffect(() => {
    let loadedFromUrl = false;
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const exampleParam = searchParams.get("example");
      const codeParam = searchParams.get("code");

      if (exampleParam) {
        const found = EXAMPLES.find((e) => e.id === exampleParam);
        if (found) {
          useDBVStore.getState().loadExample(found);
          loadedFromUrl = true;
        }
      }

      if (!loadedFromUrl && codeParam) {
        try {
          const decompressed = LZString.decompressFromEncodedURIComponent(codeParam);
          if (decompressed) {
            useDBVStore.getState().setCode(decompressed);
            loadedFromUrl = true;
          }
        } catch (err) {
          console.warn("Failed to decompress code from URL search param:", err);
        }
      } else if (!loadedFromUrl && window.location.hash.startsWith("#code=")) {
        const hashParam = window.location.hash.slice(6);
        try {
          const decompressed = LZString.decompressFromEncodedURIComponent(hashParam);
          if (decompressed) {
            useDBVStore.getState().setCode(decompressed);
            loadedFromUrl = true;
          }
        } catch (err) {
          console.warn("Failed to decompress code from URL hash:", err);
        }
      }
    }

    if (!loadedFromUrl) {
      loadSession().then((sessionData) => {
        // Guard against race: if user selected an example while loadSession was pending, don't overwrite!
        if (useDBVStore.getState().runId === 0) {
          if (sessionData?.exampleId) {
            const found = EXAMPLES.find((e) => e.id === sessionData.exampleId);
            if (found) {
              useDBVStore.getState().loadExample(found);
              return;
            }
          }
          visualizeAST();
        }
      });
    } else if (useDBVStore.getState().runId === 0) {
      visualizeAST();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcut handlers:
  // - F5 or Ctrl+Enter: Run native
  // - Ctrl+Shift+Enter: Visualize
  // - Escape: Stop
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && isRunning) {
        e.preventDefault();
        stopExecution();
        return;
      }

      if (
        e.key === "F1" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "P" || e.key === "p"))
      ) {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          visualizeAST();
        } else {
          runNative();
        }
      } else if (e.key === "F5") {
        e.preventDefault();
        runNative();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [runNative, visualizeAST, isRunning, stopExecution]);

  // Keyboard navigation: ArrowLeft (Prev) & ArrowRight (Next) to step line by line
  useEffect(() => {
    const handleKey = (e) => {
      // Don't trigger if user is actively editing inside an input, textarea, or CodeMirror editor
      const target = e.target;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.closest(".cm-editor")
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepForward();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepBack();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [stepForward, stepBack]);

  const handleShare = useCallback(() => {
    try {
      const compressed = LZString.compressToEncodedURIComponent(code);
      const url = `${window.location.origin}/dbv?code=${compressed}`;
      navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2200);
    } catch (err) {
      console.error("Failed to copy share link:", err);
    }
  }, [code]);

  // Open Problems in Console zone
  const handleOpenProblems = useCallback(() => {
    setConsoleTab("problems");
    if (!visibleZones.console) {
      toggleZoneVisibility("console");
    }
    if (isNarrowScreen) {
      setNarrowTab("console");
    }
  }, [visibleZones.console, toggleZoneVisibility, isNarrowScreen]);

  const step = trace[currentStep];
  const totalSteps = trace.length;
  const allCodeLines = useMemo(() => code.split("\n"), [code]);

  // Combine full run logs (prefer native run logs if available, else trace logs)
  const combinedAllLogs = useMemo(() => {
    if (nativeLogs.length > 0) return nativeLogs;
    if (trace.length > 0 && trace[trace.length - 1]?.consoleOutput) {
      return trace[trace.length - 1].consoleOutput;
    }
    return [];
  }, [nativeLogs, trace]);

  // Command Palette commands list
  const paletteCommands = useMemo(
    () => [
      {
        id: "run-native",
        label: "Run Code (Native Web Worker Sandbox)",
        category: "Execution",
        shortcut: "F5 / Ctrl+Enter",
        action: () => runNative(),
      },
      {
        id: "visualize-ast",
        label: "Visualize Code (Step-by-Step AST Trace)",
        category: "Execution",
        shortcut: "Ctrl+Shift+Enter",
        action: () => visualizeAST(),
      },
      {
        id: "stop-execution",
        label: "Stop Code Execution",
        category: "Execution",
        shortcut: "Escape",
        action: () => stopExecution(),
      },
      {
        id: "format-code",
        label: "Format Document (Prettier)",
        category: "Editor",
        shortcut: "Shift+Alt+F",
        action: async () => {
          const formatted = await formatCode(code);
          if (formatted && formatted !== code) setCode(formatted);
        },
      },
      {
        id: "show-problems",
        label: "Show Problems / Diagnostics",
        category: "View",
        action: () => handleOpenProblems(),
      },
      {
        id: "show-console-run",
        label: "Show Full Run Console Output",
        category: "View",
        action: () => setConsoleTab("run"),
      },
      {
        id: "show-console-live",
        label: "Show Live Step Console Output",
        category: "View",
        action: () => setConsoleTab("live"),
      },
      {
        id: "step-forward",
        label: "Step Forward to Next Line",
        category: "Stepping",
        shortcut: "→",
        action: () => stepForward(),
      },
      {
        id: "step-back",
        label: "Step Backward to Previous Line",
        category: "Stepping",
        shortcut: "←",
        action: () => stepBack(),
      },
      {
        id: "step-reset",
        label: "Reset Execution to Step 1",
        category: "Stepping",
        action: () => setCurrentStep(0),
      },
      {
        id: "open-examples",
        label: "Open Example Code Snippets",
        category: "Navigation",
        action: () => setShowExamples(true),
      },
      {
        id: "share-code",
        label: "Share Code Snippet Link",
        category: "Share",
        action: () => handleShare(),
      },
      {
        id: "toggle-max-editor",
        label: "Toggle Maximize Code Editor",
        category: "View",
        action: () => toggleMaximize("code"),
      },
      {
        id: "toggle-max-vis",
        label: "Toggle Maximize Visualization Zone",
        category: "View",
        action: () => toggleMaximize("visualization"),
      },
      {
        id: "toggle-max-console",
        label: "Toggle Maximize Console Zone",
        category: "View",
        action: () => toggleMaximize("console"),
      },
      {
        id: "run-self-test",
        label: "Run self-test (Diagnostics & In-memory validation)",
        category: "System",
        action: () => {
          const report = runSelfTest();
          const logs = [
            `CodeLens DBV Diagnostic Self-Test`,
            `=================================`,
            `Status: ${report.passed ? "ALL TESTS PASSED (PASS)" : "FAILURES DETECTED (FAIL)"}`,
            `Summary: ${report.passedCount}/${report.total} tests passing in ${report.durationMs}ms`,
            ...report.results.map(r => `  ${r.passed ? "✓" : "✗"} ${r.name}${r.error ? ` (${r.error})` : ""}`)
          ];
          setNativeLogs(logs.map((text, i) => ({
            id: `selftest-${i}`,
            method: report.passed ? "log" : "error",
            args: [text],
            stepIndex: 0
          })));
          setConsoleTab("run");
          if (!visibleZones.console) toggleZoneVisibility("console");
        },
      },
    ],
    [
      runNative,
      visualizeAST,
      stopExecution,
      code,
      setCode,
      handleOpenProblems,
      stepForward,
      stepBack,
      setCurrentStep,
      handleShare,
      toggleMaximize,
    ]
  );

  return (
    <div
      className="flex-1 h-[100dvh] flex flex-col min-h-0 overflow-hidden relative select-none"
      style={{ background: "rgb(var(--color-stage-bg))" }}
    >
      {/* Error banner */}
      <AnimatePresence>
        {runError && (
          <div
            className="px-4 py-2 text-sm font-code flex items-center justify-between shrink-0"
            style={{
              background: "rgba(var(--color-error), 0.15)",
              borderBottom: "1px solid rgba(var(--color-error), 0.35)",
              color: "rgb(var(--color-error))",
            }}
          >
            <div className="flex items-center gap-2">
              <span>⚠️ {typeof runError === "object" ? `${runError.name}: ${runError.message}` : runError}</span>
              {typeof runError === "object" && runError.line && (
                <button
                  type="button"
                  onClick={() => jumpToPosition({ line: runError.line, col: runError.column || 1, ts: Date.now() })}
                  className="text-xs underline hover:no-underline font-semibold cursor-pointer text-red-300 hover:text-white"
                  title="Jump to error line in editor"
                >
                  (line {runError.line}:{runError.column || 1}) ↗
                </button>
              )}
            </div>
            <button
              onClick={() => setRunError(null)}
              className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
            >
              ✕ Dismiss
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Maximized Zone Banner (if any zone is maximized) */}
      {maximizedZone && (
        <div
          className="px-4 py-1.5 flex items-center justify-between text-xs font-medium shrink-0 z-20"
          style={{
            background: "rgba(var(--color-accent), 0.18)",
            borderBottom: "1px solid rgba(var(--color-accent), 0.4)",
            color: "rgb(var(--color-text))",
          }}
        >
          <span>
            Zone <strong>{maximizedZone}</strong> is currently maximized
          </span>
          <Button size="xs" variant="primary" onClick={restoreMaximized}>
            Restore All Zones 🗗
          </Button>
        </div>
      )}

      {/* ── RESPONSIVE TABS (for narrow screens < 900px) ── */}
      {isNarrowScreen && !maximizedZone && (
        <div
          className="px-3 py-1.5 border-b shrink-0"
          style={{ borderColor: "rgb(var(--color-panel-border))" }}
        >
          <Tabs
            tabs={[
              { id: "code", label: "📝 Code" },
              { id: "visualization", label: "👁 Visualization" },
              { id: "console", label: "💻 Console" },
            ]}
            activeId={narrowTab}
            onChange={(id) => setNarrowTab(id)}
          />
        </div>
      )}

      {/* ── 3-ZONE RESIZABLE LAYOUT ── */}
      <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden p-2 sm:p-2.5">
        {maximizedZone ? (
          // Maximized Zone Mode (takes 100% of body)
          <div className="flex-1 min-h-0 min-w-0 flex flex-col">
            {maximizedZone === "code" && (
              <div
                className="flex-1 flex flex-col min-h-0 rounded-2xl border overflow-hidden"
                style={{
                  background: "rgb(var(--color-panel-surface))",
                  borderColor: "rgb(var(--color-panel-border))",
                }}
              >
                <div
                  className="px-3.5 py-1.5 border-b flex items-center justify-between"
                  style={{
                    background: "rgb(var(--color-panel-surface2))",
                    borderColor: "rgb(var(--color-panel-border))",
                  }}
                >
                  <span className="text-xs font-bold font-display uppercase tracking-wider">
                    📝 Code Editor (Maximized)
                  </span>
                  <Button size="xs" variant="outline" onClick={restoreMaximized}>
                    Restore 🗗
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <CodeEditor
                    className="h-full"
                    onRun={runNative}
                    onVisualize={visualizeAST}
                    onOpenProblems={handleOpenProblems}
                  />
                </div>
              </div>
            )}
            {maximizedZone === "visualization" && (
              <VisualizationZone
                step={step}
                allCodeLines={allCodeLines}
                selectedCtxId={selectedCtxId}
                onSelectContext={(id) => setSelectedCtxId(id)}
                isMaximized={true}
                onToggleMaximize={restoreMaximized}
              />
            )}
            {maximizedZone === "console" && (
              <ConsoleZone
                logs={step?.consoleOutput || []}
                allLogs={combinedAllLogs}
                currentStep={currentStep}
                totalSteps={totalSteps}
                isMaximized={true}
                onToggleMaximize={restoreMaximized}
                onCollapse={restoreMaximized}
                initialTab={consoleTab}
              />
            )}
          </div>
        ) : isNarrowScreen ? (
          // Narrow Screen Tabbed View (< 900px)
          <div className="flex-1 min-h-0 min-w-0 flex flex-col">
            {narrowTab === "code" && (
              <div
                className="flex-1 flex flex-col min-h-0 rounded-2xl border overflow-hidden"
                style={{
                  background: "rgb(var(--color-panel-surface))",
                  borderColor: "rgb(var(--color-panel-border))",
                }}
              >
                <div
                  className="flex items-center justify-between px-3 py-1.5 shrink-0 border-b select-none"
                  style={{
                    background: "rgb(var(--color-panel-surface2))",
                    borderColor: "rgb(var(--color-panel-border))",
                  }}
                >
                  <span className="text-xs font-bold font-display uppercase tracking-wider">
                    📝 Code Editor
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isRunning ? (
                      <Button
                        size="xs"
                        variant="danger"
                        onClick={stopExecution}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                      >
                        ⏹ Stop
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="xs"
                          variant="primary"
                          onClick={runNative}
                          title="Run JavaScript in native sandbox (F5)"
                        >
                          ▶ Run
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={visualizeAST}
                          title="Generate step-by-step trace (Ctrl+Shift+Enter)"
                        >
                          👁 Visualize
                        </Button>
                      </>
                    )}
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setShowExamples(true)}
                    >
                      📚 Examples
                    </Button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <CodeEditor
                    className="h-full"
                    onRun={runNative}
                    onVisualize={visualizeAST}
                    onOpenProblems={handleOpenProblems}
                  />
                </div>
              </div>
            )}
            {narrowTab === "visualization" && (
              <VisualizationZone
                step={step}
                allCodeLines={allCodeLines}
                selectedCtxId={selectedCtxId}
                onSelectContext={(id) => setSelectedCtxId(id)}
                isMaximized={false}
                onToggleMaximize={() => toggleMaximize("visualization")}
              />
            )}
            {narrowTab === "console" && (
              <ConsoleZone
                logs={step?.consoleOutput || []}
                allLogs={combinedAllLogs}
                currentStep={currentStep}
                totalSteps={totalSteps}
                isMaximized={false}
                onToggleMaximize={() => toggleMaximize("console")}
                onCollapse={() => setNarrowTab("visualization")}
                initialTab={consoleTab}
              />
            )}
          </div>
        ) : (
          // Wide Screens: Exactly 3 Zones (Code over Console on Left | Visualization on Right)
          <Group
            orientation="horizontal"
            id="dbv-main-layout-group"
            defaultLayout={{
              "zone-left": sizes.left,
              "zone-stage": sizes.stage,
            }}
            onLayoutChanged={(layout, meta) => {
              if (
                meta?.isUserInteraction &&
                layout["zone-left"] &&
                layout["zone-stage"]
              ) {
                setSizes({
                  left: layout["zone-left"],
                  stage: layout["zone-stage"],
                });
              }
            }}
            className="flex-1 min-h-0 min-w-0"
          >
            {/* Left Column: Code Editor (top) + Console (bottom) */}
            {(visibleZones.code || visibleZones.console) && (
              <>
                <Panel
                  id="zone-left"
                  defaultSize={`${visibleZones.visualization ? sizes.left : 100}%`}
                  minSize="20%"
                  maxSize="80%"
                  className="flex flex-col min-h-0 min-w-0"
                >
                  <Group
                    orientation="vertical"
                    id="dbv-left-vertical-group"
                    defaultLayout={{
                      "zone-code": sizes.code,
                      "zone-console": sizes.console,
                    }}
                    onLayoutChanged={(layout, meta) => {
                      if (
                        meta?.isUserInteraction &&
                        layout["zone-code"] &&
                        layout["zone-console"]
                      ) {
                        setSizes({
                          code: layout["zone-code"],
                          console: layout["zone-console"],
                        });
                      }
                    }}
                    className="flex-1 min-h-0 min-w-0"
                  >
                    {/* 1. CODE ZONE (Top of Left column) */}
                    {visibleZones.code && (
                      <Panel
                        id="zone-code"
                        defaultSize={`${visibleZones.console ? sizes.code : 100}%`}
                        minSize="20%"
                        maxSize="85%"
                        className="flex flex-col min-h-0 min-w-0 rounded-2xl border overflow-hidden shadow-sm @container"
                        style={{
                          background: "rgb(var(--color-panel-surface))",
                          borderColor: "rgb(var(--color-panel-border))",
                        }}
                      >
                        {/* Zone Header with Dual Run / Visualize controls */}
                        <div
                          className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 shrink-0 border-b select-none gap-1 sm:gap-2 overflow-hidden"
                          style={{
                            background: "rgb(var(--color-panel-surface2))",
                            borderColor: "rgb(var(--color-panel-border))",
                          }}
                        >
                          <span
                            className="text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                            style={{ color: "rgb(var(--color-text))" }}
                          >
                            <span>📝</span>
                            <span className="hidden @[260px]:inline">
                              Code Editor
                            </span>
                          </span>

                          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            {isRunning ? (
                              <Button
                                size="xs"
                                variant="danger"
                                onClick={stopExecution}
                                className="text-xs font-semibold px-2.5 py-0.5 shadow-sm cursor-pointer bg-red-600 hover:bg-red-700 text-white"
                                title="Stop execution (Escape)"
                              >
                                ⏹ Stop
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="xs"
                                  variant="primary"
                                  onClick={runNative}
                                  className="text-xs font-semibold px-2 sm:px-2.5 py-0.5 shadow-sm cursor-pointer"
                                  title="Run JavaScript in native sandbox (F5 or Ctrl+Enter)"
                                >
                                  ▶ Run
                                </Button>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={visualizeAST}
                                  className="text-xs font-semibold px-1.5 sm:px-2 py-0.5 cursor-pointer text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
                                  title="Generate interactive step-by-step trace (Ctrl+Shift+Enter)"
                                >
                                  👁 Visualize
                                </Button>
                              </>
                            )}

                            <Button
                              id="dbv-examples-btn"
                              size="xs"
                              variant="outline"
                              onClick={() => setShowExamples(true)}
                              className="text-xs px-1.5 sm:px-2 py-0.5 cursor-pointer"
                              title="Choose example code snippets"
                            >
                              <span className="hidden @[340px]:inline">📚 </span>
                              Examples
                            </Button>

                            <Button
                              size="xs"
                              variant={shareCopied ? "primary" : "outline"}
                              onClick={handleShare}
                              title="Copy shareable link with current code"
                              className="text-xs px-1.5 sm:px-2 py-0.5 cursor-pointer hidden @[400px]:inline-flex"
                            >
                              {shareCopied ? "✓" : "🔗 Share"}
                            </Button>

                            <div className="h-3 w-px bg-slate-700/40 mx-0.5 hidden @[420px]:block" />

                            <button
                              onClick={() => toggleMaximize("code")}
                              title="Maximize Code Zone"
                              className="text-[11px] p-0.5 px-1.5 rounded-lg border hover:bg-slate-700/20 cursor-pointer hidden @[210px]:inline-block"
                              style={{
                                borderColor: "rgb(var(--color-panel-border))",
                                color: "rgb(var(--color-text-muted))",
                              }}
                            >
                              ⛶
                            </button>
                            <button
                              onClick={() => toggleZoneVisibility("code")}
                              title="Collapse Code Zone"
                              className="text-[11px] p-0.5 px-1.5 rounded-lg border hover:bg-slate-700/20 cursor-pointer"
                              style={{
                                borderColor: "rgb(var(--color-panel-border))",
                                color: "rgb(var(--color-text-muted))",
                              }}
                            >
                              ◀
                            </button>
                          </div>
                        </div>

                        {/* Code Editor Body */}
                        <div className="flex-1 min-h-0 overflow-hidden">
                          <CodeEditor
                            className="h-full"
                            onRun={runNative}
                            onVisualize={visualizeAST}
                            onOpenProblems={handleOpenProblems}
                          />
                        </div>
                      </Panel>
                    )}

                    {/* Divider 1: Code | Console (Vertical) */}
                    {visibleZones.code && visibleZones.console && (
                      <ResizeHandle
                        direction="vertical"
                        onReset={() => setSizes({ code: 65, console: 35 })}
                      />
                    )}

                    {/* 2. CONSOLE ZONE (Bottom of Left Column, below Code Editor) */}
                    {visibleZones.console && (
                      <Panel
                        id="zone-console"
                        defaultSize={`${visibleZones.code ? sizes.console : 100}%`}
                        minSize="15%"
                        maxSize="80%"
                        className="flex flex-col min-h-0 min-w-0"
                      >
                        <ConsoleZone
                          logs={step?.consoleOutput || []}
                          allLogs={combinedAllLogs}
                          currentStep={currentStep}
                          totalSteps={totalSteps}
                          isMaximized={false}
                          onToggleMaximize={() => toggleMaximize("console")}
                          onCollapse={() => toggleZoneVisibility("console")}
                          initialTab={consoleTab}
                        />
                      </Panel>
                    )}
                  </Group>
                </Panel>

                {/* Divider 2: Left Column (Code & Console) | Right Column (Visualization Stage) */}
                {visibleZones.visualization && (
                  <ResizeHandle
                    direction="horizontal"
                    onReset={() => setSizes({ left: 38, stage: 62 })}
                  />
                )}
              </>
            )}

            {/* 3. VISUALIZATION ZONE (Right Column, Full Height!) */}
            {visibleZones.visualization && (
              <Panel
                id="zone-stage"
                defaultSize={`${
                  visibleZones.code || visibleZones.console ? sizes.stage : 100
                }%`}
                minSize="20%"
                maxSize="85%"
                className="flex flex-col min-h-0 min-w-0"
              >
                <VisualizationZone
                  step={step}
                  allCodeLines={allCodeLines}
                  selectedCtxId={selectedCtxId}
                  onSelectContext={(id) => setSelectedCtxId(id)}
                  isMaximized={false}
                  onToggleMaximize={() => toggleMaximize("visualization")}
                  onRunNative={() => runNative()}
                />
              </Panel>
            )}
          </Group>
        )}
      </div>

      {/* ── FIXED CONTROLS BAR (Bottom - Line-by-Line Next / Prev) ── */}
      <div
        className="px-3 sm:px-4 py-2.5 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 select-none z-20 shadow-md"
        style={{
          background: "rgb(var(--color-panel-surface2))",
          borderColor: "rgb(var(--color-panel-border))",
        }}
      >
        {/* Line-by-Line Step Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={stepBack}
            disabled={currentStep <= 0}
            title="Step Back to Previous Line (Arrow Left)"
            className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm px-3 py-1.5 cursor-pointer"
          >
            <span>⏮</span>
            <span>Previous</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={stepForward}
            disabled={currentStep >= totalSteps - 1}
            title="Step to Next Line (Arrow Right)"
            className="flex items-center gap-1.5 font-bold text-xs sm:text-sm px-4 py-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <span>Next Line</span>
            <span>⏭</span>
          </Button>

          <Button
            size="xs"
            variant="ghost"
            onClick={() => setCurrentStep(0)}
            disabled={totalSteps <= 0 || currentStep === 0}
            title="Reset to step 1"
            className="text-xs ml-1"
          >
            ↺ Reset
          </Button>
        </div>

        {/* Timeline Scrubber */}
        <div className="flex-1 min-w-[180px] max-w-xl flex items-center gap-3">
          <span
            className="text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0"
            style={{
              background: "rgb(var(--color-surface))",
              color: "rgb(var(--color-text))",
              border: "1px solid rgb(var(--color-panel-border))",
            }}
          >
            Step {currentStep + 1} of {Math.max(1, totalSteps)}
          </span>
          <Slider
            min={0}
            max={Math.max(0, totalSteps - 1)}
            value={currentStep}
            onChange={(val) => setCurrentStep(val)}
            disabled={totalSteps <= 1}
            aria-label="Timeline step scrubber"
          />
        </div>

        {/* Right side: Layout Menu & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Layout Menu */}
          <LayoutMenu />

          <Button
            size="xs"
            variant={visibleZones.code ? "secondary" : "outline"}
            onClick={() => toggleZoneVisibility("code")}
            title="Toggle Code Zone"
            className="hidden sm:inline-flex"
          >
            {visibleZones.code ? "Hide Editor" : "Show Editor"}
          </Button>

          {/* Created by Abdul Shamil LinkedIn link */}
          <a
            href="https://www.linkedin.com/in/abdul-shamil-85b7681a8"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-sans transition-all hover:scale-105 shrink-0 group ml-1"
            style={{
              background: "rgba(10, 102, 194, 0.12)",
              borderColor: "rgba(10, 102, 194, 0.35)",
              color: "rgb(var(--color-text))",
            }}
            title="Created by Abdul Shamil (LinkedIn profile)"
          >
            <span className="text-[10px] opacity-75">Created by</span>
            <span className="font-semibold text-blue-400 group-hover:underline">
              Abdul Shamil
            </span>
            <span className="text-[10px] font-bold text-white bg-[#0a66c2] px-1 rounded-sm leading-none py-0.5">
              in
            </span>
          </a>

          {/* Keyboard navigation hint */}
          <div
            className="hidden xl:flex items-center gap-1.5 shrink-0 text-xs font-mono opacity-75 ml-1"
            style={{ color: "rgb(var(--color-text-muted))" }}
          >
            <span className="px-1.5 py-0.5 rounded border border-slate-700/50 bg-slate-800/40 text-[10px] font-semibold">
              ←
            </span>
            <span>Prev</span>
            <span className="mx-0.5">•</span>
            <span className="px-1.5 py-0.5 rounded border border-slate-700/50 bg-slate-800/40 text-[10px] font-semibold">
              →
            </span>
            <span>Next</span>
          </div>
        </div>
      </div>

      {/* Examples drawer modal */}
      <AnimatePresence>
        {showExamples && (
          <ExamplesDrawer onClose={() => setShowExamples(false)} />
        )}
      </AnimatePresence>

      {/* Command Palette (F1 / Ctrl+Shift+P) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={paletteCommands}
      />
    </div>
  );
}
