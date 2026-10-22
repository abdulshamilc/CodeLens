// src/tools/dbv/components/stage/ContextCard.tsx
// Execution Context card combining Memory | Code columns with creation-phase and value-change animations

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExecutionContext, EnvironmentRecord, HeapObject, Binding } from "../../types";
import { isUserVariable, getVarColorVar } from "../../utils/varColors";

interface ContextCardProps {
  ctx: ExecutionContext;
  env?: EnvironmentRecord;
  heap: Record<string, HeapObject>;
  activeLine?: number | null;
  codeLines: string[];
  isTopContext: boolean;
  changedBindings?: string[];
}

export function ContextCard({
  ctx,
  env,
  heap,
  activeLine,
  codeLines,
  isTopContext,
  changedBindings = [],
}: ContextCardProps) {
  const [expandedRefs, setExpandedRefs] = useState<Record<string, boolean>>({});

  const toggleRef = (refId: string) => {
    setExpandedRefs((prev) => ({ ...prev, [refId]: !prev[refId] }));
  };

  // Filter to user-declared variables only
  const userBindings: Array<{ name: string; binding: Binding }> = [];
  if (env?.bindings) {
    for (const [name, b] of Object.entries(env.bindings)) {
      if (isUserVariable(name)) {
        userBindings.push({ name, binding: b });
      }
    }
  }

  // Phase badge colors
  const isCreation = ctx.phase === "Creation";
  const phaseBg = isCreation
    ? "rgba(var(--color-dbv-creation), 0.18)"
    : "rgba(var(--color-dbv-execution), 0.18)";
  const phaseColor = isCreation
    ? "rgb(var(--color-dbv-creation))"
    : "rgb(var(--color-dbv-execution))";

  // Helper to format values
  const formatVal = (val: any) => {
    if (val === undefined) return "undefined";
    if (val === null) return "null";
    if (typeof val === "string") return `"${val}"`;
    if (typeof val === "object" && val?.type === "ref") {
      const obj = heap[val.id];
      if (!obj) return "[Object]";
      if (obj.kind === "function") return `ƒ ${obj.label}()`;
      if (obj.kind === "array") return `Array(${obj.properties.length ?? 0})`;
      return `{…}`;
    }
    return String(val);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="rounded-2xl border shadow-xl overflow-hidden flex flex-col transition-all"
      style={{
        background: isTopContext
          ? "rgba(var(--color-panel-surface), 0.95)"
          : "rgba(var(--color-panel-surface), 0.6)",
        borderColor: isTopContext
          ? "rgb(var(--color-ctx-active))"
          : "rgb(var(--color-panel-border))",
        boxShadow: isTopContext
          ? "0 8px 30px rgba(var(--color-accent), 0.18)"
          : "none",
      }}
    >
      {/* Context Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        style={{
          background: "rgb(var(--color-panel-surface2))",
          borderColor: "rgb(var(--color-panel-border))",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: isTopContext
                ? "rgb(var(--color-accent))"
                : "rgb(var(--color-text-muted))",
            }}
          />
          <h3
            className="text-sm font-bold font-display tracking-tight flex items-center gap-1.5"
            style={{ color: "rgb(var(--color-text))" }}
          >
            <span>{ctx.name === "global" ? "Global Execution Context" : `fn ${ctx.name}()`}</span>
            {isTopContext && (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded-full uppercase"
                style={{
                  background: "rgba(var(--color-accent), 0.2)",
                  color: "rgb(var(--color-accent))",
                }}
              >
                active
              </span>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Phase Badge */}
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono tracking-wide"
            style={{ background: phaseBg, color: phaseColor }}
          >
            {ctx.phase} Phase
          </span>

          {/* this Binding */}
          <span
            className="text-xs font-mono hidden sm:inline"
            style={{ color: "rgb(var(--color-text-muted))" }}
          >
            this:{" "}
            <strong style={{ color: "rgb(var(--color-text))" }}>
              {formatVal(ctx.thisBinding)}
            </strong>
          </span>
        </div>
      </div>

      {/* Split Columns: Memory (left) | Code (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-b" style={{ borderColor: "rgb(var(--color-panel-border))" }}>
        {/* ── MEMORY COLUMN ── */}
        <div className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-dashed" style={{ borderColor: "rgba(var(--color-border), 0.6)" }}>
              <span className="text-xs font-bold uppercase tracking-wider font-display" style={{ color: "rgb(var(--color-accent))" }}>
                Memory (Variable Environment)
              </span>
              <span className="text-[11px] font-mono" style={{ color: "rgb(var(--color-text-muted))" }}>
                {userBindings.length} variable{userBindings.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Variable Rows */}
            {userBindings.length === 0 ? (
              <div
                className="text-center py-6 text-xs italic"
                style={{ color: "rgb(var(--color-text-muted))" }}
              >
                No user variables in this scope yet
              </div>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                {userBindings.map(({ name, binding }) => {
                  const varColor = getVarColorVar(name);
                  const isChanged = changedBindings.some((b) => b.endsWith(`/${name}`));
                  const isTDZ = binding.state === "uninitialized";

                  return (
                    <motion.div
                      key={name}
                      initial={isCreation ? { opacity: 0, x: -10 } : false}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center justify-between p-2 rounded-xl transition-all"
                      style={{
                        background: isChanged
                          ? "rgba(var(--color-accent), 0.2)"
                          : "rgba(var(--color-surface2), 0.5)",
                        border: isChanged
                          ? "1px solid rgb(var(--color-accent))"
                          : "1px solid rgba(var(--color-border), 0.4)",
                      }}
                    >
                      {/* Variable Name in its own color */}
                      <span className="font-bold flex items-center gap-1.5" style={{ color: varColor }}>
                        <span>{name}</span>
                        <span className="text-[10px] font-normal opacity-60">({binding.kind})</span>
                      </span>

                      {/* Variable Value with TDZ badge or Strike-out pop-in animation */}
                      <div className="flex items-center gap-2">
                        {isTDZ ? (
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              background: "rgba(var(--color-state-tdz), 0.2)",
                              color: "rgb(var(--color-state-tdz))",
                              border: "1px solid rgba(var(--color-state-tdz), 0.4)",
                            }}
                          >
                            &lt;uninitialized&gt; TDZ
                          </span>
                        ) : (
                          <AnimatePresence mode="popLayout">
                            <motion.span
                              key={String(binding.value)}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="font-semibold"
                              style={{
                                color: isChanged ? "rgb(var(--color-accent))" : "rgb(var(--color-text))",
                              }}
                            >
                              {formatVal(binding.value)}
                            </motion.span>
                          </AnimatePresence>
                        )}

                        {/* Ref expand toggle */}
                        {typeof binding.value === "object" && (binding.value as any)?.type === "ref" && (
                          <button
                            onClick={() => toggleRef((binding.value as any).id)}
                            className="text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                            style={{
                              background: "rgb(var(--color-surface2))",
                              color: "rgb(var(--color-text))",
                              border: "1px solid rgb(var(--color-border))",
                            }}
                          >
                            {expandedRefs[(binding.value as any).id] ? "hide" : "ref"}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed pt-2 border-t border-dashed" style={{ color: "rgb(var(--color-text-muted))", borderColor: "rgba(var(--color-border), 0.5)" }}>
            This is Variable Environment where all your variables and functions are storing key:value pairs in memory.
          </p>
        </div>

        {/* ── CODE COLUMN ── */}
        <div className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-dashed" style={{ borderColor: "rgba(var(--color-border), 0.6)" }}>
              <span className="text-xs font-bold uppercase tracking-wider font-display" style={{ color: "rgb(var(--color-success))" }}>
                Code (Thread of Execution)
              </span>
              <span className="text-[11px] font-mono" style={{ color: "rgb(var(--color-text-muted))" }}>
                line {activeLine ?? ctx.sourceLine}
              </span>
            </div>

            {/* Context Code snippet with highlighted line */}
            <div className="space-y-1 font-mono text-xs overflow-auto max-h-56">
              {codeLines.map((line, idx) => {
                const lineNum = idx + 1;
                const isCurrent = activeLine === lineNum;

                return (
                  <div
                    key={lineNum}
                    className="flex items-center gap-2 px-2 py-0.5 rounded transition-colors"
                    style={{
                      background: isCurrent ? "rgba(var(--color-accent), 0.22)" : "transparent",
                    }}
                  >
                    <span className="w-5 text-right shrink-0 text-[10px] select-none" style={{ color: "rgb(var(--color-text-muted))" }}>
                      {lineNum}
                    </span>
                    <span
                      className="whitespace-pre truncate"
                      style={{
                        color: isCurrent ? "rgb(var(--color-text))" : "rgba(var(--color-text), 0.75)",
                        fontWeight: isCurrent ? 700 : 400,
                      }}
                    >
                      {line || " "}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed pt-2 border-t border-dashed" style={{ color: "rgb(var(--color-text-muted))", borderColor: "rgba(var(--color-border), 0.5)" }}>
            This is Thread of Execution. Each line of code is executed line by line.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
