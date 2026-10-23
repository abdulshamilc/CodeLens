// src/tools/dbv/components/stage/CallStackBox.tsx
// Compact call stack with context chips stacked bottom-up, push/pop animations,
// active highlighting, selection for inspection, and stack overflow state.
import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "../../../../shared/ui";
export function CallStackBox({ callStack, selectedCtxId, onSelectContext, activeLine, hasStackOverflow = false, isMaximized = false, onToggleMaximize, onCollapse, }) {
    const containerRef = useRef(null);
    const totalFrames = callStack.length;
    const topCtx = totalFrames > 0 ? callStack[totalFrames - 1] : null;
    // Auto-scroll to keep the top chip in view
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [totalFrames]);
    return (<div className="flex flex-col rounded-2xl border p-3 w-full h-full select-none min-h-[220px]" style={{
            background: "rgb(var(--color-panel-surface))",
            borderColor: "rgb(var(--color-panel-border))",
        }}>
      {/* Box Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b shrink-0" style={{ borderColor: "rgba(var(--color-panel-border), 0.7)" }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold tracking-wider uppercase font-display truncate" style={{ color: "rgb(var(--color-accent))" }}>
            CALL STACK
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold shrink-0" style={{
            background: "rgb(var(--color-surface2))",
            color: "rgb(var(--color-text-muted))",
        }}>
            {totalFrames}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] font-mono mr-1 hidden @[150px]:inline" style={{ color: "rgb(var(--color-text-muted))" }}>
            bottom-up
          </span>
          {onToggleMaximize && (<button onClick={onToggleMaximize} title={isMaximized ? "Restore" : "Maximize Call Stack"} className="text-[11px] p-0.5 px-1 rounded hover:bg-slate-700/20 cursor-pointer" style={{ color: "rgb(var(--color-text-muted))" }}>
              {isMaximized ? "🗗" : "⛶"}
            </button>)}
          {onCollapse && (<button onClick={onCollapse} title="Collapse Call Stack" className="text-[11px] p-0.5 px-1 rounded hover:bg-slate-700/20 cursor-pointer" style={{ color: "rgb(var(--color-text-muted))" }}>
              ◀
            </button>)}
        </div>
      </div>

      {/* Stack Overflow Alert */}
      {hasStackOverflow && (<div className="p-2 mb-2 rounded-xl text-xs font-bold font-mono text-center shrink-0 animate-pulse" style={{
                background: "rgba(var(--color-state-error), 0.18)",
                color: "rgb(var(--color-state-error))",
                border: "1px solid rgba(var(--color-state-error), 0.5)",
            }}>
          ⚠️ Stack Overflow!
        </div>)}

      {/* Chips Area: stacked bottom-up (top context at the top of scroll) */}
      <div ref={containerRef} className="flex-1 overflow-y-auto flex flex-col-reverse justify-end gap-1.5 p-0.5 min-h-0">
        <AnimatePresence mode="popLayout">
          {totalFrames > 0 ? (callStack.map((ctx, idx) => {
            const isTop = idx === totalFrames - 1;
            const isSelected = selectedCtxId ? ctx.id === selectedCtxId : isTop;
            const isCreation = ctx.phase === "Creation";
            const pausedLine = isTop ? activeLine ?? ctx.sourceLine : ctx.sourceLine;
            // Format proper label and badge
            const properName = ctx.type === "Global"
                ? "Global Context"
                : ctx.name === "(anonymous)"
                    ? "anonymous()"
                    : `${ctx.name}()`;
            const typeBadge = ctx.type === "Global" ? "GEC" : "FEC";
            const fullTooltip = ctx.type === "Global"
                ? "Global Execution Context (GEC) — Always at base of call stack"
                : `Function Execution Context: ${ctx.name}() — Defined at line ${ctx.sourceLine}`;
            return (<div key={ctx.id} className="flex flex-col gap-0.5">
                  {/* Outer scope link indicator */}
                  {ctx.outerEnvId && idx > 0 && (<div className="flex items-center gap-1 pl-3 text-[9px] font-mono opacity-60">
                      <span style={{ color: "rgb(var(--color-text-muted))" }}>↓ outer</span>
                      <div className="h-px flex-1" style={{ background: "rgba(var(--color-border), 0.5)" }}/>
                    </div>)}

                  <Tooltip content={fullTooltip} position="right">
                    <motion.button layout initial={{ opacity: 0, y: -16, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.92 }} transition={{ type: "spring", stiffness: 450, damping: 28 }} onClick={() => onSelectContext(ctx.id)} className="w-full text-left px-2.5 py-1.5 rounded-xl border flex items-center justify-between gap-1.5 transition-all cursor-pointer group" style={{
                    background: isSelected
                        ? "rgba(var(--color-ctx-active), 0.16)"
                        : "rgb(var(--color-panel-surface2))",
                    borderColor: isSelected
                        ? "rgb(var(--color-ctx-active))"
                        : "rgba(var(--color-panel-border), 0.8)",
                    boxShadow: isTop
                        ? "0 0 12px rgba(var(--color-accent), 0.22)"
                        : "none",
                }}>
                      {/* Left: Context Name Chip */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{
                    background: isTop
                        ? "rgb(var(--color-accent))"
                        : "rgb(var(--color-text-muted))",
                }}/>
                        <span className="font-mono text-xs font-bold truncate" style={{
                    color: isSelected
                        ? "rgb(var(--color-text))"
                        : "rgba(var(--color-text), 0.88)",
                }}>
                          {properName}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded font-normal shrink-0 opacity-70" style={{
                    background: "rgba(var(--color-border), 0.35)",
                    color: "rgb(var(--color-text-muted))",
                }}>
                          {typeBadge}
                        </span>
                      </div>

                      {/* Right: Phase Badge (C/E) & Line */}
                      <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold" title={isCreation ? "Creation Phase" : "Execution Phase"} style={{
                    background: isCreation
                        ? "rgba(var(--color-dbv-creation), 0.2)"
                        : "rgba(var(--color-dbv-execution), 0.2)",
                    color: isCreation
                        ? "rgb(var(--color-dbv-creation))"
                        : "rgb(var(--color-dbv-execution))",
                }}>
                          {isCreation ? "C" : "E"}
                        </span>

                        <span className="px-1 rounded text-[10px] opacity-75" style={{
                    background: "rgba(var(--color-border), 0.3)",
                    color: "rgb(var(--color-text-muted))",
                }}>
                          L{pausedLine}
                        </span>
                      </div>
                    </motion.button>
                  </Tooltip>
                </div>);
        })) : (<div className="text-center py-8 text-xs italic" style={{ color: "rgb(var(--color-text-muted))" }}>
              Stack is empty
            </div>)}
        </AnimatePresence>
      </div>

      {/* Box Footer: Frames counter */}
      <div className="pt-2 mt-1 border-t flex items-center justify-between text-[11px] font-mono shrink-0" style={{
            borderColor: "rgba(var(--color-panel-border), 0.7)",
            color: "rgb(var(--color-text-muted))",
        }}>
        <span>
          {totalFrames} {totalFrames === 1 ? "frame" : "frames"}
        </span>
        {selectedCtxId && topCtx && selectedCtxId !== topCtx.id && (<button onClick={() => onSelectContext(topCtx.id)} className="text-[10px] font-semibold underline hover:no-underline cursor-pointer" style={{ color: "rgb(var(--color-accent))" }}>
            Back to live ➜
          </button>)}
      </div>
    </div>);
}
