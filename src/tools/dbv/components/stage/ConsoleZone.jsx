// src/tools/dbv/components/stage/ConsoleZone.jsx
// Console Zone: Terminal output (stdout/stderr), Custom Input (stdin), Problems diagnostics,
// Live Step logs, exit code status indicators, and click-to-jump problem navigation.

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
  onClear,
}) {
  const {
    diagnostics = [],
    jumpToPosition,
    runError,
    trace = [],
    customInput = "",
    setCustomInput,
    executionResult = {},
    isRunning = false,
  } = useDBVStore();

  // Active Tab: "run" | "input" | "problems" | "live"
  const [mode, setMode] = useState(initialTab || "run");

  useEffect(() => {
    if (initialTab) {
      setMode(initialTab);
    }
  }, [initialTab]);

  const activeMode = mode;
  const displayedLogs = activeMode === "run" ? allLogs : logs;

  // Integrate runtime error into Problems tab (robust normalization)
  const runtimeProblem = useMemo(() => {
    const currentStepObj = trace[currentStep];
    const err = currentStepObj?.error || runError;
    if (!err) return null;

    if (typeof err === "string") {
      return {
        id: "runtime-err-str",
        severity: "error",
        message: err,
        line: 1,
        col: 1,
        source: err.includes("Syntax") ? "Syntax" : err.includes("timed out") ? "Timeout" : "Runtime",
        sourceSnippet: "",
      };
    }

    return {
      id: "runtime-err-obj",
      severity: "error",
      message: `${err.name || "Error"}: ${err.message || String(err)}`,
      line: err.line || 1,
      col: err.column || 1,
      source: err.kind === "parse" ? "Syntax" : err.kind === "timeout" ? "Timeout" : err.kind === "unhandledrejection" ? "UnhandledRejection" : "Runtime",
      sourceSnippet: err.sourceSnippet || "",
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
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {/* Mode switch: Full Run (Output) vs Input (stdin) vs Problems vs Live Step */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Terminal / Output Tab */}
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
              title="Show standard output and error from running code"
            >
              <span>▶ Output</span>
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

            {/* Custom Input Tab (stdin) */}
            <button
              onClick={() => setMode("input")}
              className={`text-xs font-bold font-display uppercase tracking-wider px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                activeMode === "input" ? "shadow-sm" : "opacity-60 hover:opacity-100"
              }`}
              style={{
                background:
                  activeMode === "input" ? "rgb(var(--color-surface))" : "transparent",
                color:
                  activeMode === "input"
                    ? "rgb(var(--color-text))"
                    : "rgb(var(--color-text-muted))",
              }}
              title="Configure custom standard input (stdin) for input(), prompt(), or readline()"
            >
              <span>📥 Input</span>
              {customInput.trim().length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>

            {/* Problems Tab */}
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

            {/* Live Step Tab */}
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
              title="Show logs as each line executes (sync with Step Forward)"
            >
              <span>💻 Live Step</span>
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
          </div>
        </div>

        {/* Action Controls & Execution Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Status Badge */}
          {isRunning ? (
            <span className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <span className="w-2 h-2 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              <span>Running…</span>
            </span>
          ) : executionResult.exitCode !== null && executionResult.exitCode !== undefined ? (
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                executionResult.exitCode === 0
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : executionResult.exitCode === 124
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-red-500/15 text-red-400 border-red-500/30"
              }`}
            >
              <span>
                {executionResult.exitCode === 0
                  ? `✓ Exit 0 (${executionResult.executionTimeMs || 0}ms)`
                  : executionResult.exitCode === 124
                  ? "⏱ Timeout (124)"
                  : `✕ Exit ${executionResult.exitCode}`}
              </span>
            </span>
          ) : null}

          {/* Clear Button */}
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              title="Clear Console Output"
              className="text-xs p-1 px-1.5 rounded-lg border hover:bg-slate-700/20 cursor-pointer font-mono flex items-center gap-1"
              style={{
                borderColor: "rgb(var(--color-panel-border))",
                color: "rgb(var(--color-text-muted))",
              }}
            >
              <span>🗑️</span>
              <span className="text-[10px] hidden sm:inline">Clear</span>
            </button>
          )}

          {/* Maximize / Restore Button */}
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

      {/* ── TAB CONTENT ── */}
      {activeMode === "input" ? (
        // Custom Input Panel (stdin)
        <div className="flex-1 p-3 flex flex-col gap-2 min-h-0 overflow-hidden font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Custom Standard Input (stdin)</span>
            <span>Consumed line-by-line by <code>input()</code>, <code>prompt()</code>, <code>readline()</code></span>
          </div>
          <textarea
            value={customInput}
            onChange={(e) => setCustomInput?.(e.target.value)}
            placeholder={"Enter custom input lines here...\nExample:\n42\nHello World\n100"}
            className="flex-1 w-full p-2.5 rounded-lg bg-black/40 border border-slate-700/60 text-slate-200 font-mono text-xs resize-none focus:outline-hidden focus:border-indigo-500/80 leading-relaxed"
            aria-label="Custom standard input (stdin)"
          />
        </div>
      ) : activeMode === "problems" ? (
        // Problems / Diagnostics Panel
        <div className="flex-1 p-2 overflow-y-auto space-y-1.5 font-sans text-xs">
          {allProblems.length > 0 ? (
            allProblems.map((diag, index) => {
              const isErr = diag.severity === "error";
              return (
                <div
                  key={diag.id || index}
                  onClick={() =>
                    jumpToPosition?.({ line: diag.line || 1, col: diag.col || 1, ts: Date.now() })
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
                        <span>source</span>
                        <span>•</span>
                        <span className="font-mono">
                          [{diag.line || 1}, {diag.col || 1}]
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
        // Output / Logs Panel (Full Run & Live Step)
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
                          onClick={() => jumpToPosition?.({ line, col, ts: Date.now() })}
                          className="text-[11px] font-mono underline hover:no-underline font-medium text-red-300 hover:text-white shrink-0 cursor-pointer"
                          title="Click to jump to line in editor"
                        >
                          line {line}:{col} ↗
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
                  <span className="break-all font-mono leading-relaxed whitespace-pre-wrap">
                    {log.args.join(" ")}
                  </span>
                </div>
              );
            })
          ) : executionResult.exitCode === 0 && !isRunning ? (
            <div
              className="flex flex-col items-center justify-center h-full text-center text-xs py-6 gap-1"
              style={{ color: "rgb(var(--color-text-muted))" }}
            >
              <span className="text-emerald-400 font-semibold text-sm">✓ Program executed successfully</span>
              <span className="text-[11px] text-slate-400">(No output was printed. Exit code: 0)</span>
            </div>
          ) : (
            <div
              className="flex items-center justify-center h-full text-center text-xs italic py-4"
              style={{ color: "rgb(var(--color-text-muted))" }}
            >
              No console output yet. Click <strong>▶ Run</strong> or <strong>👁 Visualize</strong> to execute.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
