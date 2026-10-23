// src/tools/dbv/components/stage/ConsoleZone.jsx
// Console Zone: Terminal logs with method styling, Live Step vs Full Run vs Problems tabs,
// rich DevTools-style error cards with 3-line code frames, and click-to-jump problem navigation.

import React, { useState, useEffect, useMemo } from "react";
import { useDBVStore } from "../../store/useDBVStore";

export function ConsoleZone({
  logs = [],
  allLogs = [],
  currentStep = 0,
  totalSteps = 0,
  isMaximized,
  onToggleMaximize,
  onCollapse,
  initialTab,
}) {
  const { diagnostics = [], jumpToPosition, runError, trace = [] } = useDBVStore();

  // Mode: "live" | "run" | "problems"
  const [mode, setMode] = useState(initialTab || "live");

  useEffect(() => {
    if (initialTab) {
      setMode(initialTab);
    }
  }, [initialTab]);

  // When code runs for the first time or on initial load / clicking Run:
  const isInitialRunWithLogs =
    mode !== "problems" && currentStep === 0 && logs.length === 0 && allLogs.length > 0;
  const activeMode =
    mode === "problems"
      ? "problems"
      : mode === "run" || isInitialRunWithLogs
      ? "run"
      : "live";

  const displayedLogs = activeMode === "run" ? allLogs : logs;

  // Integrate runtime error into Problems tab
  const runtimeProblem = useMemo(() => {
    const currentStepObj = trace[currentStep];
    const err = currentStepObj?.error || (runError && typeof runError === "object" ? runError : null);
    if (!err || !err.name) return null;
    return {
      id: "runtime-err",
      severity: "error",
      message: `${err.name}: ${err.message}`,
      line: err.line || 1,
      col: err.column || 1,
      source: err.kind === "parse" ? "Syntax" : err.kind === "unhandledrejection" ? "UnhandledRejection" : "Runtime",
      sourceSnippet: err.sourceSnippet,
    };
  }, [trace, currentStep, runError]);

  const allProblems = useMemo(() => {
    if (!runtimeProblem) return diagnostics;
    const hasMatch = diagnostics.some((d) => d.line === runtimeProblem.line && d.message.includes(runtimeProblem.message));
    return hasMatch ? diagnostics : [runtimeProblem, ...diagnostics];
  }, [diagnostics, runtimeProblem]);

  const errorCount = allProblems.filter((d) => d.severity === "error").length;
  const warningCount = allProblems.filter((d) => d.severity === "warning").length;

  return (
    <div
      className="flex-1 h-full min-h-0 min-w-0 flex flex-col rounded-2xl border overflow-hidden shadow-sm select-none"
      style={{
        background: "rgb(var(--color-panel-surface))",
        borderColor: "rgb(var(--color-panel-border))",
      }}
    >
      {/* ── CONSOLE HEADER ── */}
      <div
        className="px-3 py-1.5 border-b flex items-center justify-between gap-2 shrink-0 overflow-hidden"
        style={{
          background: "rgb(var(--color-panel-surface2))",
          borderColor: "rgb(var(--color-panel-border))",
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Mode switch: Live Step vs Full Run vs Problems */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setMode("live")}
              className={`text-xs font-bold font-display uppercase tracking-wider px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                activeMode === "live" ? "shadow-sm" : "opacity-60 hover:opacity-100"
              }`}
              style={{
                background:
                  activeMode === "live" ? "rgb(var(--color-surface))" : "transparent",
                color:
                  activeMode === "live"
                    ? "rgb(var(--color-text))"
                    : "rgb(var(--color-text-muted))",
              }}
              title="Show logs as each line executes (sync with Next Line)"
            >
              <span>💻</span>
              <span>Live Step</span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.2 rounded-full"
                style={{
                  background: "rgba(var(--color-accent), 0.15)",
                  color: "rgb(var(--color-accent))",
                }}
              >
                {logs.length}
              </span>
            </button>

            <button
              onClick={() => setMode("run")}
              className={`text-xs font-bold font-display uppercase tracking-wider px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                activeMode === "run" ? "shadow-sm" : "opacity-60 hover:opacity-100"
              }`}
              style={{
                background:
                  activeMode === "run" ? "rgb(var(--color-surface))" : "transparent",
                color:
                  activeMode === "run"
                    ? "rgb(var(--color-text))"
                    : "rgb(var(--color-text-muted))",
              }}
              title="Show all console output from running the script"
            >
              <span>▶ Full Run</span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.2 rounded-full"
                style={{
                  background: "rgb(var(--color-surface2))",
                  color: "rgb(var(--color-text-muted))",
                }}
              >
                {allLogs.length}
              </span>
            </button>

            <button
              onClick={() => setMode("problems")}
              className={`text-xs font-bold font-display uppercase tracking-wider px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                activeMode === "problems" ? "shadow-sm" : "opacity-60 hover:opacity-100"
              }`}
              style={{
                background:
                  activeMode === "problems" ? "rgb(var(--color-surface))" : "transparent",
                color:
                  activeMode === "problems"
                    ? "rgb(var(--color-text))"
                    : "rgb(var(--color-text-muted))",
              }}
              title="Show syntax errors and runtime diagnostics"
            >
              <span>⚠️ Problems</span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold"
                style={{
                  background:
                    errorCount > 0
                      ? "rgba(239, 68, 68, 0.2)"
                      : warningCount > 0
                      ? "rgba(234, 179, 8, 0.2)"
                      : "rgb(var(--color-surface2))",
                  color:
                    errorCount > 0
                      ? "rgb(239, 68, 68)"
                      : warningCount > 0
                      ? "rgb(234, 179, 8)"
                      : "rgb(var(--color-text-muted))",
                }}
              >
                {allProblems.length}
              </span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleMaximize}
            title={isMaximized ? "Restore" : "Maximize Console Zone"}
            className="text-xs p-1 px-1.5 rounded-lg border hover:bg-slate-700/20 cursor-pointer font-mono flex items-center gap-1"
            style={{
              borderColor: "rgb(var(--color-panel-border))",
              color: "rgb(var(--color-text-muted))",
            }}
          >
            <span>{isMaximized ? "🗗" : "⛶"}</span>
            <span className="text-[10px] hidden sm:inline">
              {isMaximized ? "Restore" : "Maximize"}
            </span>
          </button>
          <button
            onClick={onCollapse}
            title="Collapse Console"
            className="text-xs p-1 px-1.5 rounded-lg border hover:bg-slate-700/20 cursor-pointer font-mono"
            style={{
              borderColor: "rgb(var(--color-panel-border))",
              color: "rgb(var(--color-text-muted))",
            }}
          >
            ▾
          </button>
        </div>
      </div>

      {/* Initial Run Notification Banner */}
      {isInitialRunWithLogs && (
        <div
          className="px-3 py-1 text-[11px] font-sans flex items-center justify-between shrink-0 border-b"
          style={{
            background: "rgba(var(--color-accent), 0.12)",
            borderColor: "rgba(var(--color-accent), 0.25)",
            color: "rgb(var(--color-text))",
          }}
        >
          <span>
            ⚡ <strong>Execution output:</strong> {allLogs.length} item
            {allLogs.length !== 1 ? "s" : ""} logged. Click <strong>Next Line ⏭</strong> to step line-by-line.
          </span>
          <button
            onClick={() => setMode("live")}
            className="text-[10px] underline hover:no-underline font-semibold cursor-pointer shrink-0 ml-2"
            style={{ color: "rgb(var(--color-accent))" }}
          >
            Live Mode
          </button>
        </div>
      )}

      {/* ── BODY: PROBLEMS VIEW OR LOGS OUTPUT ── */}
      {activeMode === "problems" ? (
        <div className="flex-1 p-2 overflow-y-auto space-y-1.5 font-sans text-xs">
          {allProblems.length > 0 ? (
            allProblems.map((diag, index) => {
              const isErr = diag.severity === "error";
              return (
                <div
                  key={diag.id || index}
                  onClick={() =>
                    jumpToPosition({ line: diag.line, col: diag.col, ts: Date.now() })
                  }
                  className="p-2 rounded-lg cursor-pointer transition-colors group hover:bg-slate-500/10 border border-transparent hover:border-slate-500/20"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-sm shrink-0 select-none">
                      {isErr ? "❌" : "⚠️"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-medium font-mono text-[12px] truncate"
                          style={{
                            color: isErr
                              ? "rgb(var(--color-error, 239, 68, 68))"
                              : "rgb(var(--color-warning, 234, 179, 8))",
                          }}
                        >
                          {diag.message}
                        </span>
                        {diag.source && (
                          <span className="text-[10px] font-mono px-1 rounded bg-slate-700/20 text-slate-400">
                            {diag.source}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>main.js</span>
                        <span>•</span>
                        <span className="font-mono">
                          [{diag.line}, {diag.col}]
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-400 transition-opacity">
                          Click to jump
                        </span>
                      </div>
                    </div>
                  </div>

                  {diag.sourceSnippet && (
                    <pre className="mt-2 p-2 rounded bg-black/40 text-[11px] font-mono whitespace-pre overflow-x-auto border border-red-500/20 text-slate-200">
                      {diag.sourceSnippet}
                    </pre>
                  )}
                </div>
              );
            })
          ) : (
            <div
              className="flex flex-col items-center justify-center h-full text-center text-xs py-8 gap-2"
              style={{ color: "rgb(var(--color-text-muted))" }}
            >
              <span className="text-2xl text-emerald-500">✓</span>
              <span>No problems have been detected in the workspace.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 p-2.5 font-mono text-xs overflow-y-auto space-y-1.5 select-text">
          {displayedLogs.length > 0 ? (
            displayedLogs.map((log) => {
              const isError = log.method === "error" || Boolean(log.error);
              if (isError) {
                const err = log.error;
                const line = err?.line;
                const col = err?.column || 1;
                return (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg border text-xs"
                    style={{
                      background: "rgba(239, 68, 68, 0.08)",
                      borderColor: "rgba(239, 68, 68, 0.25)",
                      color: "rgb(var(--color-error))",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5">
                        <span className="shrink-0 select-none">✕</span>
                        <span className="font-semibold break-all">
                          {log.args.join(" ")}
                        </span>
                      </div>
                      {line && (
                        <button
                          type="button"
                          onClick={() => jumpToPosition({ line, col, ts: Date.now() })}
                          className="text-[11px] font-mono underline hover:no-underline font-medium text-red-300 hover:text-white shrink-0 cursor-pointer"
                          title="Click to jump to line in editor"
                        >
                          main.js:{line}:{col} ↗
                        </button>
                      )}
                    </div>
                    {err?.sourceSnippet && (
                      <pre className="mt-2 p-2 rounded bg-black/40 text-[11px] font-mono whitespace-pre overflow-x-auto border border-red-500/20 text-slate-200">
                        {err.sourceSnippet}
                      </pre>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2 py-0.5 px-1.5 rounded transition-colors hover:bg-slate-700/10"
                  style={{
                    color:
                      log.method === "warn"
                        ? "rgb(var(--color-warning))"
                        : "rgb(var(--color-text))",
                  }}
                >
                  <span className="opacity-40 select-none">›</span>
                  <span className="break-all font-mono leading-relaxed">
                    {log.args.join(" ")}
                  </span>
                </div>
              );
            })
          ) : (
            <div
              className="flex items-center justify-center h-full text-center text-xs italic py-4"
              style={{ color: "rgb(var(--color-text-muted))" }}
            >
              No console output yet. Call <code>console.log()</code> and step through code to see logs here.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
