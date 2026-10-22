// src/tools/dbv/components/panels/ExplanationPanel.tsx
// Plain-English narration panel for the current step

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDBVStore } from "../../store/useDBVStore";
import { PanelWrapper } from "./PanelWrapper";

const EVENT_ICONS: Record<string, string> = {
  "program-start": "🚀",
  "creation-phase": "🏗️",
  "execution-phase": "▶️",
  "declare": "📝",
  "assign": "✏️",
  "call": "📞",
  "return": "↩️",
  "hoisting": "⬆️",
  "tdz-error": "⚠️",
  "throw": "💥",
  "catch": "🪤",
  "finally": "🏁",
  "enqueue-task": "📬",
  "event-loop-tick": "🔄",
  "block-enter": "📦",
  "block-exit": "📤",
  "expression-eval": "🔢",
  "unsupported": "❓",
};

const EVENT_COLORS: Record<string, string> = {
  "creation-phase": "#f59e0b",
  "hoisting": "#f59e0b",
  "execution-phase": "#6366f1",
  "declare": "#84cc16",
  "assign": "#22c55e",
  "call": "#8b5cf6",
  "return": "#06b6d4",
  "throw": "#ef4444",
  "tdz-error": "#ef4444",
  "catch": "#f97316",
  "enqueue-task": "#a855f7",
  "event-loop-tick": "#ec4899",
  "unsupported": "#94a3b8",
};

export function ExplanationPanel() {
  const { trace, currentStep } = useDBVStore();
  const step = trace[currentStep];

  return (
    <PanelWrapper id="explanation" title="💡 What's happening?">
      <div className="p-3 min-h-[80px]">
        <AnimatePresence mode="wait">
          {step ? (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {/* Event type badge */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{EVENT_ICONS[step.eventType] ?? "ℹ️"}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
                  style={{
                    background: `${EVENT_COLORS[step.eventType] ?? "#64748b"}22`,
                    color: EVENT_COLORS[step.eventType] ?? "#64748b",
                  }}
                >
                  {step.eventType}
                </span>
                {step.nodeRange && (
                  <span className="text-[10px] font-code" style={{ color: "rgb(var(--color-text-muted))" }}>
                    line {step.nodeRange.startLine}
                  </span>
                )}
              </div>

              {/* Explanation text */}
              <p className="text-sm leading-relaxed" style={{ color: "rgb(var(--color-text))" }}>
                {step.explanation}
              </p>

              {/* Error box */}
              {step.error && (
                <div
                  className="mt-2 p-2 rounded-lg text-xs font-code"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#ef4444",
                  }}
                >
                  <div className="font-bold">{step.error.name}: {step.error.message}</div>
                  {step.error.stack.length > 0 && (
                    <div className="mt-1 opacity-70">
                      {step.error.stack.map((frame, i) => (
                        <div key={i}>  at {frame}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-16 gap-1"
            >
              <span className="text-2xl">⚡</span>
              <p className="text-xs text-center" style={{ color: "rgb(var(--color-text-muted))" }}>
                Click <strong>Run / Analyze</strong> to start visualizing
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PanelWrapper>
  );
}
