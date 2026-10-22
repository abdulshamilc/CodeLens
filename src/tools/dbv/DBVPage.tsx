// src/tools/dbv/DBVPage.tsx
// Complete 3-zone resizable layout for DBV:
// 1. CODE zone (left) | (2. VISUALIZATION zone (top-right) / 3. CONSOLE zone (bottom-right))
// 100dvh full height, fixed toolbar, fixed controls bar, auto-run on first load.

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Group, Panel, type Layout } from "react-resizable-panels";
import LZString from "lz-string";
import { useDBVStore } from "./store/useDBVStore";
import { useDBVLayoutStore, ZoneId } from "./store/useDBVLayoutStore";
import { CodeEditor } from "./components/CodeEditor";
import { VisualizationZone } from "./components/stage/VisualizationZone";
import { ConsoleZone } from "./components/stage/ConsoleZone";
import { ResizeHandle } from "./components/layout/ResizeHandle";
import { LayoutMenu } from "./components/layout/LayoutMenu";
import { ExamplesDrawer } from "./components/ExamplesDrawer";
import { Button, Slider, Tabs } from "../../shared/ui";
import type { WorkerInMessage, WorkerOutMessage } from "./types";

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

  const workerRef = useRef<Worker | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [selectedCtxId, setSelectedCtxId] = useState<string | null>(null);
  const [isNarrowScreen, setIsNarrowScreen] = useState<boolean>(false);
  const [narrowTab, setNarrowTab] = useState<"code" | "visualization" | "console">("visualization");

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
    document.title = "DBV – JS Visualizer | CodeLens";
  }, []);

  // Debounced auto-save session
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveSession(), 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [code, saveSession]);

  // Terminate worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const runCode = useCallback((codeOrEvent?: string | unknown) => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    const currentCode = typeof codeOrEvent === "string" ? codeOrEvent : useDBVStore.getState().code;

    setIsRunning(true);
    setRunError(null);

    const worker = new Worker(
      new URL("./engine/interpreter.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;
      if (msg.type === "trace") {
        setTrace(msg.steps);
        setIsRunning(false);
        worker.terminate();
        workerRef.current = null;
      } else if (msg.type === "error") {
        setRunError(msg.message);
        setIsRunning(false);
        worker.terminate();
        workerRef.current = null;
      } else if (msg.type === "parse-error") {
        setRunError(`SyntaxError: ${msg.message} (line ${msg.line})`);
        setIsRunning(false);
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.onerror = (e) => {
      setRunError(e.message ?? "Worker error");
      setIsRunning(false);
      worker.terminate();
      workerRef.current = null;
    };

    workerRef.current = worker;
    const msg: WorkerInMessage = { type: "run", code: currentCode, stepLimit: 20_000 };
    worker.postMessage(msg);

    // Safety timeout: 15s limit
    setTimeout(() => {
      if (workerRef.current === worker) {
        worker.terminate();
        workerRef.current = null;
        setRunError("Execution timed out (15s limit). Check for infinite loops.");
        setIsRunning(false);
      }
    }, 15_000);
  }, [setTrace, setIsRunning, setRunError]);

  // Initial mount: load URL param or session, and auto-run once to populate Step 1
  useEffect(() => {
    let loadedFromUrl = false;
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const codeParam = searchParams.get("code");
      if (codeParam) {
        try {
          const decompressed = LZString.decompressFromEncodedURIComponent(codeParam);
          if (decompressed) {
            useDBVStore.getState().setCode(decompressed);
            loadedFromUrl = true;
          }
        } catch (err) {
          console.warn("Failed to decompress code from URL search param:", err);
        }
      } else if (window.location.hash.startsWith("#code=")) {
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
      loadSession().then(() => {
        runCode();
      });
    } else {
      runCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcut: Ctrl+Enter to run
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runCode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [runCode]);

  // Keyboard navigation: ArrowLeft (Prev) & ArrowRight (Next) to step line by line
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't trigger if user is actively editing inside an input, textarea, or CodeMirror editor
      const target = e.target as HTMLElement | null;
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

  const step = trace[currentStep];
  const totalSteps = trace.length;
  const allCodeLines = useMemo(() => code.split("\n"), [code]);

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
            <span>⚠️ {runError}</span>
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
        <div className="px-3 py-1.5 border-b shrink-0" style={{ borderColor: "rgb(var(--color-panel-border))" }}>
          <Tabs
            tabs={[
              { id: "code", label: "📝 Code" },
              { id: "visualization", label: "👁 Visualization" },
              { id: "console", label: "💻 Console" },
            ]}
            activeId={narrowTab}
            onChange={(id) => setNarrowTab(id as any)}
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
                  style={{ background: "rgb(var(--color-panel-surface2))", borderColor: "rgb(var(--color-panel-border))" }}
                >
                  <span className="text-xs font-bold font-display uppercase tracking-wider">
                    📝 Code Editor (Maximized)
                  </span>
                  <Button size="xs" variant="outline" onClick={restoreMaximized}>
                    Restore 🗗
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <CodeEditor className="h-full" />
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
                allLogs={trace.length > 0 ? trace[trace.length - 1]?.consoleOutput || [] : []}
                currentStep={currentStep}
                totalSteps={totalSteps}
                isMaximized={true}
                onToggleMaximize={restoreMaximized}
                onCollapse={restoreMaximized}
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
                    <Button size="xs" variant="primary" onClick={runCode} disabled={isRunning}>
                      {isRunning ? "..." : "▶ Run"}
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => setShowExamples(true)}>
                      📚 Examples
                    </Button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <CodeEditor className="h-full" />
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
                allLogs={trace.length > 0 ? trace[trace.length - 1]?.consoleOutput || [] : []}
                currentStep={currentStep}
                totalSteps={totalSteps}
                isMaximized={false}
                onToggleMaximize={() => toggleMaximize("console")}
                onCollapse={() => setNarrowTab("visualization")}
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
            onLayoutChanged={(layout: Layout, meta) => {
              if (meta?.isUserInteraction && layout["zone-left"] && layout["zone-stage"]) {
                setSizes({ left: layout["zone-left"], stage: layout["zone-stage"] });
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
                    onLayoutChanged={(layout: Layout, meta) => {
                      if (meta?.isUserInteraction && layout["zone-code"] && layout["zone-console"]) {
                        setSizes({ code: layout["zone-code"], console: layout["zone-console"] });
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
                        {/* Zone Header with Run, Examples, Share & Window controls */}
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
                            <span className="hidden @[260px]:inline">Code Editor</span>
                          </span>

                          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={runCode}
                              disabled={isRunning}
                              className="text-xs font-semibold px-2 sm:px-2.5 py-0.5 shadow-sm cursor-pointer"
                              title="Run and analyze code (Ctrl+Enter)"
                            >
                              {isRunning ? "..." : "▶ Run"}
                            </Button>

                            <Button
                              id="dbv-examples-btn"
                              size="xs"
                              variant="outline"
                              onClick={() => setShowExamples(true)}
                              className="text-xs px-1.5 sm:px-2 py-0.5 cursor-pointer"
                              title="Choose example code snippets"
                            >
                              <span className="hidden @[320px]:inline">📚 </span>Examples
                            </Button>

                            <Button
                              size="xs"
                              variant={shareCopied ? "primary" : "outline"}
                              onClick={handleShare}
                              title="Copy shareable link with current code"
                              className="text-xs px-1.5 sm:px-2 py-0.5 cursor-pointer hidden @[380px]:inline-flex"
                            >
                              {shareCopied ? "✓" : "🔗 Share"}
                            </Button>

                            <div className="h-3 w-px bg-slate-700/40 mx-0.5 hidden @[400px]:block" />

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
                          <CodeEditor className="h-full" />
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
                          allLogs={trace.length > 0 ? trace[trace.length - 1]?.consoleOutput || [] : []}
                          currentStep={currentStep}
                          totalSteps={totalSteps}
                          isMaximized={false}
                          onToggleMaximize={() => toggleMaximize("console")}
                          onCollapse={() => toggleZoneVisibility("console")}
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
                defaultSize={`${visibleZones.code || visibleZones.console ? sizes.stage : 100}%`}
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
            <span className="font-semibold text-blue-400 group-hover:underline">Abdul Shamil</span>
            <span className="text-[10px] font-bold text-white bg-[#0a66c2] px-1 rounded-sm leading-none py-0.5">in</span>
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
    </div>
  );
}
