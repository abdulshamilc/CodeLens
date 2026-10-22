// src/tools/dbv/components/panels/ConsolePanel.tsx
// Console output panel mirroring what console.log/warn/error produce during execution

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDBVStore } from "../../store/useDBVStore";
import { PanelWrapper } from "./PanelWrapper";
import type { ConsoleEntry } from "../../types";

const METHOD_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
  log:   { icon: "›", color: "#e2e8f0", bg: "transparent" },
  info:  { icon: "ℹ", color: "#38bdf8", bg: "rgba(56,189,248,0.06)" },
  warn:  { icon: "⚠", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  error: { icon: "✕", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
};

function ConsoleLine({ entry }: { entry: ConsoleEntry }) {
  const style = METHOD_STYLES[entry.method] ?? METHOD_STYLES.log;
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className="flex items-start gap-2 px-2 py-1 rounded text-xs font-code"
      style={{ background: style.bg, color: style.color }}
    >
      <span className="shrink-0 mt-0.5 w-3 text-center" style={{ opacity: 0.6 }}>{style.icon}</span>
      <span className="break-all">{entry.args.join(" ")}</span>
    </motion.div>
  );
}

export function ConsolePanel() {
  const { trace, currentStep } = useDBVStore();
  const step = trace[currentStep];
  const entries = step?.consoleOutput ?? [];
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <PanelWrapper
      id="console"
      title="🖥️ Console"
      badge={entries.length > 0 ? String(entries.length) : undefined}
    >
      <div
        ref={scrollRef}
        className="p-2 overflow-y-auto flex flex-col gap-0.5"
        style={{ maxHeight: "180px", minHeight: "60px" }}
        aria-label="Console output"
        aria-live="polite"
      >
        {entries.length === 0 ? (
          <div className="py-2 text-center text-xs" style={{ color: "rgb(var(--color-text-muted))" }}>
            No console output yet
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <ConsoleLine key={entry.id} entry={entry} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </PanelWrapper>
  );
}
