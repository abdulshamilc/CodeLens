// src/tools/dbv/components/stage/ConsoleZone.tsx
// Console Zone: Terminal logs with method styling, clear button, count badge, and maximize/collapse controls

import React, { useState } from "react";
import type { ConsoleEntry } from "../../types";

interface ConsoleZoneProps {
  logs: ConsoleEntry[];
  allLogs?: ConsoleEntry[];
  currentStep?: number;
  totalSteps?: number;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onCollapse: () => void;
}

export function ConsoleZone({
  logs,
  allLogs = [],
  currentStep = 0,
  totalSteps = 0,
  isMaximized,
  onToggleMaximize,
  onCollapse,
}: ConsoleZoneProps) {
  // Mode: "live" (logs up to current step) vs "run" (all logs from run)
  const [mode, setMode] = useState<"live" | "run">("live");

  // When code runs for the first time or on initial load / clicking Run:
  // If we are at step 0 and logs is empty, but allLogs has entries,
  // we show run output so the user immediately sees the console output of their code!
  // As soon as currentStep > 0 (stepping with Next Line), it shows live step logs.
  const isInitialRunWithLogs = currentStep === 0 && logs.length === 0 && allLogs.length > 0;
  const activeMode = mode === "run" || isInitialRunWithLogs ? "run" : "live";
  const displayedLogs = activeMode === "run" ? allLogs : logs;

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
          {/* Mode switch: Live Step vs Full Run */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setMode("live")}
              className={`text-xs font-bold font-display uppercase tracking-wider px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                activeMode === "live" ? "shadow-sm" : "opacity-60 hover:opacity-100"
              }`}
              style={{
                background: activeMode === "live" ? "rgb(var(--color-surface))" : "transparent",
                color: activeMode === "live" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))",
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
                background: activeMode === "run" ? "rgb(var(--color-surface))" : "transparent",
                color: activeMode === "run" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))",
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
            ⚡ <strong>Execution output:</strong> {allLogs.length} item{allLogs.length !== 1 ? "s" : ""} logged. Click <strong>Next Line ⏭</strong> to step line-by-line.
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

      {/* ── LOGS OUTPUT BODY ── */}
      <div className="flex-1 p-2.5 font-mono text-xs overflow-y-auto space-y-1">
        {displayedLogs.length > 0 ? (
          displayedLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-2 py-0.5 px-1.5 rounded transition-colors hover:bg-slate-700/10"
              style={{
                color:
                  log.method === "error"
                    ? "rgb(var(--color-error))"
                    : log.method === "warn"
                    ? "rgb(var(--color-warning))"
                    : "rgb(var(--color-text))",
              }}
            >
              <span className="opacity-40 select-none">›</span>
              <span className="break-all font-mono leading-relaxed">{log.args.join(" ")}</span>
            </div>
          ))
        ) : (
          <div
            className="flex items-center justify-center h-full text-center text-xs italic py-4"
            style={{ color: "rgb(var(--color-text-muted))" }}
          >
            No console output yet. Call <code>console.log()</code> and step through code to see logs here.
          </div>
        )}
      </div>
    </div>
  );
}
