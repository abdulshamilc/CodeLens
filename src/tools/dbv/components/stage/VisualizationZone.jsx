// src/tools/dbv/components/stage/VisualizationZone.tsx
// Exactly ONE self-contained visualization unit: Call Stack (compact chips),
// Current Executing Context (Memory | Code), Web APIs, Event Loop, Queues, and Narration banner.
// Internal layout uses container queries and CSS grid (clamp/minmax) to fit at 1366x768+.
import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CallStackBox } from "./CallStackBox";
import { CurrentExecutingContextPanel } from "./CurrentExecutingContextPanel";
export function VisualizationZone({ step, allCodeLines, selectedCtxId, onSelectContext, isMaximized, onToggleMaximize, }) {
    // Current active execution context (top of call stack) vs selected
    const topCtx = useMemo(() => {
        if (!step?.callStack || step.callStack.length === 0)
            return null;
        return step.callStack[step.callStack.length - 1];
    }, [step]);
    const displayedCtx = useMemo(() => {
        if (!step?.callStack || step.callStack.length === 0)
            return null;
        if (selectedCtxId) {
            const found = step.callStack.find((c) => c.id === selectedCtxId);
            if (found)
                return found;
        }
        return topCtx;
    }, [step, selectedCtxId, topCtx]);
    const isLiveContext = displayedCtx?.id === topCtx?.id;
    const activeLine = step?.nodeRange?.startLine ?? null;
    const env = displayedCtx ? step?.environments[displayedCtx.variableEnvId] : undefined;
    // Event loop status text
    const eventLoopStatusText = useMemo(() => {
        if (!step)
            return "Ready to start execution";
        if (step.callStack && step.callStack.length > 0) {
            return "Call stack running synchronous frame";
        }
        if (step.microtaskQueue && step.microtaskQueue.length > 0) {
            return "Stack empty → draining microtask queue";
        }
        if (step.macrotaskQueue && step.macrotaskQueue.length > 0) {
            return "Microtasks empty → taking next callback";
        }
        return "Event loop idle (waiting for tasks)";
    }, [step]);
    return (<div className="@container flex-1 h-full min-h-0 min-w-0 flex flex-col rounded-2xl border overflow-hidden shadow-sm select-none" style={{
            background: "rgb(var(--color-stage-bg))",
            borderColor: "rgb(var(--color-panel-border))",
        }}>
      {/* ── ZONE HEADER ── */}
      <div className="px-3.5 py-2 border-b flex items-center justify-between gap-2 shrink-0" style={{
            background: "rgb(var(--color-panel-surface2))",
            borderColor: "rgb(var(--color-panel-border))",
        }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{
            background: step
                ? "rgb(var(--color-success))"
                : "rgb(var(--color-text-muted))",
        }}/>
          <h2 className="text-xs sm:text-sm font-bold font-display tracking-tight truncate">
            {displayedCtx
            ? displayedCtx.type === "Global"
                ? "Global Execution Context"
                : `FEC: ${displayedCtx.name}()`
            : "Execution Stage"}
          </h2>
          {displayedCtx && (<span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full shrink-0" style={{
                background: displayedCtx.phase === "Creation"
                    ? "rgba(var(--color-dbv-creation), 0.15)"
                    : "rgba(var(--color-dbv-execution), 0.15)",
                color: displayedCtx.phase === "Creation"
                    ? "rgb(var(--color-dbv-creation))"
                    : "rgb(var(--color-dbv-execution))",
                border: displayedCtx.phase === "Creation"
                    ? "1px solid rgba(var(--color-dbv-creation), 0.3)"
                    : "1px solid rgba(var(--color-dbv-execution), 0.3)",
            }}>
              {displayedCtx.phase} Phase
            </span>)}
        </div>

        {/* Maximize Zone button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onToggleMaximize} title={isMaximized ? "Restore" : "Maximize Visualization Zone"} className="text-xs p-1 px-1.5 rounded-lg border hover:bg-slate-700/20 cursor-pointer font-mono flex items-center gap-1" style={{
            borderColor: "rgb(var(--color-panel-border))",
            color: "rgb(var(--color-text-muted))",
        }}>
            <span>{isMaximized ? "🗗" : "⛶"}</span>
            <span className="text-[10px] hidden sm:inline">
              {isMaximized ? "Restore" : "Maximize"}
            </span>
          </button>
        </div>
      </div>

      {/* ── BIG ATTENTION-GRABBING NARRATION BANNER ── */}
      <div className="px-4 py-3 sm:py-3.5 border-b flex items-start gap-3.5 shrink-0 relative overflow-hidden transition-all shadow-sm z-10" style={{
            background: "linear-gradient(90deg, rgba(var(--color-accent), 0.14) 0%, rgba(var(--color-panel-surface2), 0.96) 100%)",
            borderColor: "rgba(var(--color-accent), 0.35)",
        }}>
        {/* Glowing bulb icon */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 text-xl shadow-md" style={{
            background: "rgba(var(--color-accent), 0.22)",
            border: "1px solid rgba(var(--color-accent), 0.45)",
            color: "rgb(var(--color-accent))",
        }}>
          💡
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full" style={{
            background: "rgba(var(--color-accent), 0.28)",
            color: "rgb(var(--color-accent))",
            border: "1px solid rgba(var(--color-accent), 0.5)",
        }}>
              Execution Narration
            </span>
            {activeLine !== null && (<span className="text-[10px] sm:text-[11px] font-mono font-semibold px-2 py-0.5 rounded" style={{
                background: "rgba(var(--color-surface), 0.6)",
                color: "rgb(var(--color-text-muted))",
                border: "1px solid rgb(var(--color-panel-border))",
            }}>
                Line {activeLine}
              </span>)}
          </div>

          <AnimatePresence mode="wait">
            <motion.p key={step?.index ?? 0} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: "easeOut" }} className="text-sm sm:text-[15px] font-semibold leading-relaxed" style={{ color: "rgb(var(--color-text))" }}>
              {step?.explanation || "Load your code and click Run / Analyze to step through execution line by line."}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* ── RESPONSIVE ADAPTIVE INTERNAL GRID (Not separately user-resizable) ── */}
      {/* ── RESPONSIVE ADAPTIVE INTERNAL GRID ── */}
      <div className="flex-1 min-h-0 min-w-0 p-3 sm:p-3.5 grid grid-cols-1 @[640px]:grid-cols-[minmax(130px,165px)_1fr] @[920px]:grid-cols-[minmax(130px,165px)_1fr_minmax(160px,210px)] gap-3 sm:gap-3.5 overflow-y-auto overflow-x-hidden">
        {/* 1. Call Stack (Left) */}
        <div className="min-h-0 min-w-0 flex flex-col h-full overflow-hidden">
          <CallStackBox callStack={step?.callStack || []} selectedCtxId={selectedCtxId} onSelectContext={onSelectContext} activeLine={activeLine} hasStackOverflow={Boolean(step?.error?.message?.includes("Maximum call stack size"))}/>
        </div>

        {/* 2. Current Executing Context (Center / Largest) */}
        <div className="min-h-0 min-w-0 flex flex-col h-full overflow-hidden">
          <CurrentExecutingContextPanel ctx={displayedCtx} env={env} heap={step?.heap || {}} activeLine={isLiveContext ? activeLine : null} allCodeLines={allCodeLines} isLiveContext={isLiveContext} onBackToLive={() => onSelectContext(topCtx?.id ?? "")} changedBindings={step?.changedBindings || []}/>
        </div>

        {/* 3. Web APIs, Event Loop & Queues (Adapts cleanly: vertical column when wide, dock or vertical stack when resized smaller) */}
        <div className="min-h-0 min-w-0 flex flex-col gap-2 @[640px]:col-span-2 @[920px]:col-span-1">
          <div className="grid grid-cols-1 @[450px]:grid-cols-2 @[640px]:grid-cols-4 @[920px]:grid-cols-1 gap-2.5">
            {/* Web APIs */}
            <div className="rounded-2xl border p-2.5 flex flex-col gap-1.5 shrink-0" style={{
            background: "rgb(var(--color-panel-surface))",
            borderColor: "rgb(var(--color-panel-border))",
        }}>
              <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: "rgba(var(--color-panel-border), 0.7)" }}>
                <span className="text-[11px] font-bold uppercase tracking-wider font-display truncate" style={{ color: "rgb(var(--color-webapi-card))" }}>
                  Web APIs
                </span>
                <span className="text-[10px] font-mono" style={{ color: "rgb(var(--color-text-muted))" }}>
                  {step?.webApis ? step.webApis.length : 0} active
                </span>
              </div>

              <div className="min-h-[44px] flex flex-col justify-center font-mono text-xs">
                {step?.webApis && step.webApis.length > 0 ? (<div className="flex flex-col gap-1">
                    {step.webApis.map((api) => (<div key={api.id} className="p-1.5 rounded-lg flex items-center justify-between gap-1 text-[11px] border" style={{
                    background: "rgba(var(--color-webapi-card), 0.12)",
                    borderColor: "rgba(var(--color-webapi-card), 0.35)",
                }}>
                        <span className="font-semibold truncate">{api.kind}</span>
                        <span className="text-[10px] opacity-75 shrink-0">{api.remainingMs ?? 0}ms</span>
                      </div>))}
                  </div>) : (<div className="text-center py-1.5 text-[11px] italic" style={{ color: "rgb(var(--color-text-muted))" }}>
                    No pending Web APIs
                  </div>)}
              </div>
            </div>

            {/* Event Loop */}
            <div className="rounded-2xl border p-2.5 flex flex-col gap-1.5 shrink-0" style={{
            background: "rgb(var(--color-panel-surface))",
            borderColor: "rgb(var(--color-panel-border))",
        }}>
              <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: "rgba(var(--color-panel-border), 0.7)" }}>
                <span className="text-[11px] font-bold uppercase tracking-wider font-display truncate" style={{ color: "rgb(var(--color-accent))" }}>
                  Event Loop
                </span>
                <span className="text-[10px] font-mono opacity-75" style={{ color: "rgb(var(--color-text-muted))" }}>
                  Active
                </span>
              </div>

              <div className="min-h-[44px] flex items-center gap-2 font-mono text-[11px]">
                <motion.div key={step?.index ?? 0} initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ duration: 0.45, ease: "easeOut" }} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{
            background: "rgba(var(--color-accent), 0.18)",
            color: "rgb(var(--color-accent))",
        }}>
                  ⟳
                </motion.div>
                <span className="text-[10px] leading-tight block line-clamp-2" style={{ color: "rgb(var(--color-text-muted))" }}>
                  {eventLoopStatusText}
                </span>
              </div>
            </div>

            {/* Microtask Queue */}
            <div className="rounded-2xl border p-2.5 flex flex-col gap-1.5 shrink-0" style={{
            background: "rgb(var(--color-panel-surface))",
            borderColor: "rgb(var(--color-panel-border))",
        }}>
              <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: "rgba(var(--color-panel-border), 0.7)" }}>
                <span className="text-[11px] font-bold uppercase tracking-wider font-display truncate" style={{ color: "rgb(var(--color-microtask-card))" }}>
                  Microtasks
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full" style={{
            background: "rgba(var(--color-microtask-card), 0.18)",
            color: "rgb(var(--color-microtask-card))",
        }}>
                  High Priority
                </span>
              </div>

              <div className="min-h-[44px] flex flex-col justify-center font-mono text-[11px]">
                {step?.microtaskQueue && step.microtaskQueue.length > 0 ? (<div className="flex flex-wrap gap-1">
                    {step.microtaskQueue.map((task) => (<div key={task.id} className="p-1 px-1.5 rounded-md text-[10px] truncate border" style={{
                    background: "rgba(var(--color-microtask-card), 0.14)",
                    borderColor: "rgba(var(--color-microtask-card), 0.35)",
                }}>
                        {task.label}
                      </div>))}
                  </div>) : (<div className="text-center py-1 text-[11px] italic" style={{ color: "rgb(var(--color-text-muted))" }}>
                    Queue empty
                  </div>)}
              </div>
            </div>

            {/* Callback Queue */}
            <div className="rounded-2xl border p-2.5 flex flex-col gap-1.5 shrink-0" style={{
            background: "rgb(var(--color-panel-surface))",
            borderColor: "rgb(var(--color-panel-border))",
        }}>
              <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: "rgba(var(--color-panel-border), 0.7)" }}>
                <span className="text-[11px] font-bold uppercase tracking-wider font-display truncate" style={{ color: "rgb(var(--color-macrotask-card))" }}>
                  Callback Queue
                </span>
                <span className="text-[10px] font-mono" style={{ color: "rgb(var(--color-text-muted))" }}>
                  Macrotasks
                </span>
              </div>

              <div className="min-h-[44px] flex flex-col justify-center font-mono text-[11px]">
                {step?.macrotaskQueue && step.macrotaskQueue.length > 0 ? (<div className="flex flex-wrap gap-1">
                    {step.macrotaskQueue.map((task) => (<div key={task.id} className="p-1 px-1.5 rounded-md text-[10px] truncate border" style={{
                    background: "rgba(var(--color-macrotask-card), 0.14)",
                    borderColor: "rgba(var(--color-macrotask-card), 0.35)",
                }}>
                        {task.label}
                      </div>))}
                  </div>) : (<div className="text-center py-1 text-[11px] italic" style={{ color: "rgb(var(--color-text-muted))" }}>
                    Queue empty
                  </div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
