// src/tools/dbv/components/stage/CurrentExecutingContextPanel.tsx
// Current Executing Context panel: Header with context info, Memory (Variable Environment)
// and Code (Thread of Execution) dual-column table with syntax highlighting and sliding pointer.
import React, { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isUserVariable, getVarColorVar } from "../../utils/varColors";
import { Tooltip, Button } from "../../../../shared/ui";
// Simple JS syntax highlighter using semantic CSS tokens
function highlightJsLine(line) {
    if (!line)
        return " ";
    // Handle single-line comments
    const commentIdx = line.indexOf("//");
    let codePart = line;
    let commentPart = "";
    if (commentIdx !== -1) {
        codePart = line.slice(0, commentIdx);
        commentPart = line.slice(commentIdx);
    }
    // Tokenize keywords, strings, and numbers
    const tokens = codePart.split(/([a-zA-Z0-9_$]+|"[^"]*"|'[^']*'|`[^`]*`|\s+|[^\s\w])/g);
    return (<>
      {tokens.map((token, i) => {
            if (!token)
                return null;
            if (/^(var|let|const|function|return|if|else|for|while|class|new|async|await)$/.test(token)) {
                return (<span key={i} className="font-semibold" style={{ color: "rgb(var(--color-accent))" }}>
              {token}
            </span>);
            }
            if (/^(console|setTimeout|setInterval|Promise|Math|Array|Object)$/.test(token)) {
                return (<span key={i} style={{ color: "rgb(var(--color-var-5))" }}>
              {token}
            </span>);
            }
            if (/^("[^"]*"|'[^']*'|`[^`]*`)$/.test(token)) {
                return (<span key={i} style={{ color: "rgb(var(--color-var-2))" }}>
              {token}
            </span>);
            }
            if (/^\d+$/.test(token)) {
                return (<span key={i} style={{ color: "rgb(var(--color-var-3))" }}>
              {token}
            </span>);
            }
            return <span key={i}>{token}</span>;
        })}
      {commentPart && (<span style={{ color: "rgb(var(--color-text-muted))", fontStyle: "italic" }}>
          {commentPart}
        </span>)}
    </>);
}
export function CurrentExecutingContextPanel({ ctx, env, heap, callStack = [], activeLine, allCodeLines, isLiveContext, onBackToLive, changedBindings = [], isMaximized = false, onToggleMaximize, onCollapse, }) {
    const [expandedRefs, setExpandedRefs] = useState({});
    const activeLineRef = useRef(null);
    const toggleRef = (refId) => {
        setExpandedRefs((prev) => ({ ...prev, [refId]: !prev[refId] }));
    };

    // Find human-readable name for outer scope instead of raw env ID
    const outerScopeName = useMemo(() => {
        if (!ctx?.outerEnvId) return null;
        if (ctx.outerEnvId === "env-global") return "Global";
        const parentCtx = callStack.find(
            (c) => c.variableEnvId === ctx.outerEnvId || c.lexicalEnvId === ctx.outerEnvId
        );
        if (parentCtx) {
            return parentCtx.type === "Global" ? "Global" : `${parentCtx.name}()`;
        }
        return "Global";
    }, [ctx?.outerEnvId, callStack]);
    // Auto-scroll active code line into view
    useEffect(() => {
        if (activeLineRef.current) {
            activeLineRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }, [activeLine]);
    // Determine lines belonging to this context
    const { contextLines, startLineNum } = useMemo(() => {
        if (!ctx)
            return { contextLines: allCodeLines, startLineNum: 1 };
        if (ctx.type === "Global") {
            return { contextLines: allCodeLines, startLineNum: 1 };
        }
        // Function context: check if function object in heap has sourceRange
        const fnObj = Object.values(heap).find((h) => h.kind === "function" && (h.label === ctx.name || h.properties?.name === ctx.name) && h.sourceRange);
        if (fnObj && fnObj.sourceRange) {
            const [start, end] = fnObj.sourceRange;
            const sliced = allCodeLines.slice(Math.max(0, start - 1), end);
            return { contextLines: sliced, startLineNum: start };
        }
        // Fallback: if sourceLine is known, show from sourceLine
        if (ctx.sourceLine && ctx.sourceLine > 0 && ctx.sourceLine <= allCodeLines.length) {
            // Find end of block or show entire code
            return { contextLines: allCodeLines, startLineNum: 1 };
        }
        return { contextLines: allCodeLines, startLineNum: 1 };
    }, [ctx, allCodeLines, heap]);
    // Filter to user-declared variables only
    const userBindings = useMemo(() => {
        if (!env?.bindings)
            return [];
        const list = [];
        for (const [name, b] of Object.entries(env.bindings)) {
            if (isUserVariable(name)) {
                list.push({ name, binding: b });
            }
        }
        return list;
    }, [env]);
    // Format binding value
    const formatVal = (val) => {
        if (val === undefined)
            return "undefined";
        if (val === null)
            return "null";
        if (typeof val === "string")
            return `"${val}"`;
        if (typeof val === "number" || typeof val === "boolean")
            return String(val);
        if (typeof val === "object" && val?.type === "ref") {
            const obj = heap[val.id];
            if (!obj)
                return "[Object]";
            if (obj.kind === "function") {
                const fnName = obj.label || obj.properties?.name || "anonymous";
                return `ƒ ${fnName}()`;
            }
            if (obj.kind === "array") {
                const len = obj.properties ? (Array.isArray(obj.properties) ? obj.properties.length : (obj.properties.length ?? Object.keys(obj.properties).length)) : 0;
                return `Array(${len})`;
            }
            if (obj.label && obj.label !== "Object") {
                return obj.label;
            }
            return "{…}";
        }
        return String(val);
    };
    if (!ctx) {
        return (<div className="flex-1 flex flex-col items-center justify-center p-8 rounded-2xl border text-center select-none" style={{
                background: "rgb(var(--color-panel-surface))",
                borderColor: "rgb(var(--color-panel-border))",
            }}>
        <p className="text-sm font-semibold mb-1" style={{ color: "rgb(var(--color-text))" }}>
          No Active Execution Context
        </p>
        <p className="text-xs" style={{ color: "rgb(var(--color-text-muted))" }}>
          Run your code or step forward to initialize the Global Execution Context.
        </p>
      </div>);
    }
    const isCreation = ctx.phase === "Creation";
    const contextTitle = ctx.type === "Global"
        ? "Global Execution Context"
        : ctx.name === "(anonymous)"
            ? "Function Context: (anonymous)"
            : `Function Context: ${ctx.name}()`;
    return (<motion.div key={ctx.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.18 }} className="flex-1 flex flex-col min-w-0 rounded-2xl border overflow-hidden shadow-lg @container" style={{
            background: "rgb(var(--color-panel-surface))",
            borderColor: "rgb(var(--color-panel-border))",
        }}>
      {/* ── PANEL HEADER (one line, ellipsis + tooltips, never clipped) ── */}
      <div className="px-4 py-2.5 border-b flex items-center justify-between gap-3 shrink-0 select-none min-w-0" style={{
            background: "rgb(var(--color-panel-surface2))",
            borderColor: "rgb(var(--color-panel-border))",
        }}>
        {/* Left: Context Title & Phase Badge */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{
            background: isLiveContext
                ? "rgb(var(--color-accent))"
                : "rgb(var(--color-text-muted))",
        }}/>
          <Tooltip content={contextTitle}>
            <h3 className="text-xs sm:text-sm font-bold font-display tracking-tight truncate" style={{ color: "rgb(var(--color-text))" }}>
              {contextTitle}
            </h3>
          </Tooltip>

          {/* Phase Badge */}
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full shrink-0" style={{
            background: isCreation
                ? "rgba(var(--color-dbv-creation), 0.18)"
                : "rgba(var(--color-dbv-execution), 0.18)",
            color: isCreation
                ? "rgb(var(--color-dbv-creation))"
                : "rgb(var(--color-dbv-execution))",
            border: isCreation
                ? "1px solid rgba(var(--color-dbv-creation), 0.35)"
                : "1px solid rgba(var(--color-dbv-execution), 0.35)",
        }}>
            {ctx.phase} Phase
          </span>
        </div>

        {/* Right: this binding & outer scope info */}
        <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
          <Tooltip content={`this: ${formatVal(ctx.thisBinding)}`}>
            <span className="hidden @[480px]:inline px-2 py-0.5 rounded truncate max-w-[140px]" style={{
            background: "rgba(var(--color-border), 0.3)",
            color: "rgb(var(--color-text-muted))",
        }}>
              this: <strong style={{ color: "rgb(var(--color-text))" }}>{formatVal(ctx.thisBinding)}</strong>
            </span>
          </Tooltip>

          {outerScopeName && (<Tooltip content={`Outer Lexical Scope: ${outerScopeName} (${ctx.outerEnvId})`}>
              <span className="hidden @[600px]:inline px-2 py-0.5 rounded text-[11px]" style={{
                background: "rgba(var(--color-border), 0.25)",
                color: "rgb(var(--color-text-muted))",
            }}>
                outer: <strong style={{ color: "rgb(var(--color-text))" }}>{outerScopeName}</strong>
              </span>
            </Tooltip>)}

          {!isLiveContext && onBackToLive && (<Button size="xs" variant="primary" onClick={onBackToLive}>
              Back to Live ➜
            </Button>)}

          {onToggleMaximize && (<button onClick={onToggleMaximize} title={isMaximized ? "Restore" : "Maximize Context"} className="text-[11px] p-0.5 px-1.5 rounded hover:bg-slate-700/20 cursor-pointer" style={{ color: "rgb(var(--color-text-muted))" }}>
              {isMaximized ? "🗗" : "⛶"}
            </button>)}
          {onCollapse && (<button onClick={onCollapse} title="Collapse Context" className="text-[11px] p-0.5 px-1.5 rounded hover:bg-slate-700/20 cursor-pointer" style={{ color: "rgb(var(--color-text-muted))" }}>
              ▾
            </button>)}
        </div>
      </div>

      {/* Inspecting Past Frame Warning Banner */}
      {!isLiveContext && (<div className="px-4 py-1.5 text-xs font-medium flex items-center justify-between shrink-0" style={{
                background: "rgba(var(--color-warning), 0.14)",
                borderBottom: "1px solid rgba(var(--color-warning), 0.3)",
                color: "rgb(var(--color-warning))",
            }}>
          <span>👁 Viewing paused execution frame (read-only inspection)</span>
          {onBackToLive && (<button onClick={onBackToLive} className="font-bold underline cursor-pointer ml-2">
              Return to Top Frame
            </button>)}
        </div>)}

      {/* ── DUAL-COLUMN TABLE: Memory (left) | Code (right) ── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 @[500px]:grid-cols-2 divide-y @[500px]:divide-y-0 @[500px]:divide-x overflow-hidden" style={{ borderColor: "rgb(var(--color-panel-border))" }}>
        {/* ── LEFT COLUMN: MEMORY (VARIABLE ENVIRONMENT) ── */}
        <div className="flex flex-col min-h-0 overflow-hidden p-3.5">
          <div className="flex items-center justify-between pb-2 mb-2 border-b shrink-0" style={{ borderColor: "rgba(var(--color-border), 0.5)" }}>
            <span className="text-xs font-bold uppercase tracking-wider font-display" style={{ color: "rgb(var(--color-accent))" }}>
              Memory (Variable Environment)
            </span>
            <span className="text-[11px] font-mono" style={{ color: "rgb(var(--color-text-muted))" }}>
              {userBindings.length} variable{userBindings.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Variables Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {userBindings.length === 0 ? (<div className="text-center py-10 text-xs italic" style={{ color: "rgb(var(--color-text-muted))" }}>
                No variables declared in this scope yet
              </div>) : (userBindings.map(({ name, binding }) => {
            const varColor = getVarColorVar(name);
            const isChanged = changedBindings.some((b) => b.endsWith(`/${name}`));
            const isTDZ = binding.state === "uninitialized";
            return (<motion.div key={name} initial={isCreation ? { opacity: 0, x: -8 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="flex flex-wrap items-center justify-between gap-1.5 p-2 rounded-xl border text-xs font-mono transition-all" style={{
                    background: isChanged
                        ? "rgba(var(--color-accent), 0.18)"
                        : "rgba(var(--color-surface2), 0.5)",
                    borderColor: isChanged
                        ? "rgb(var(--color-accent))"
                        : "rgba(var(--color-panel-border), 0.7)",
                    boxShadow: isChanged
                        ? "0 0 10px rgba(var(--color-accent), 0.3)"
                        : "none",
                }}>
                    {/* Variable Name in stable palette color */}
                    <span className="font-bold flex items-center gap-1.5 break-all" style={{ color: varColor }}>
                      <span className="text-xs font-mono font-bold">{name}</span>
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded font-normal shrink-0" style={{
                        background: "rgba(var(--color-border), 0.35)",
                        color: "rgb(var(--color-text-muted))",
                      }}>
                        {binding.kind}
                      </span>
                    </span>

                    {/* Variable Value with TDZ badge or pop-in animation */}
                    <div className="flex items-center gap-2 max-w-full">
                      {isTDZ ? (<span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{
                        background: "rgba(var(--color-state-tdz), 0.2)",
                        color: "rgb(var(--color-state-tdz))",
                        border: "1px solid rgba(var(--color-state-tdz), 0.4)",
                    }}>
                          &lt;uninitialized&gt; TDZ
                        </span>) : (<AnimatePresence mode="popLayout">
                          <motion.span key={String(binding.value)} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-semibold break-all" style={{
                        color: isChanged
                            ? "rgb(var(--color-accent))"
                            : "rgb(var(--color-text))",
                    }}>
                            {formatVal(binding.value)}
                          </motion.span>
                        </AnimatePresence>)}

                      {/* Expand toggle for Ref objects */}
                      {typeof binding.value === "object" && binding.value?.type === "ref" && (<button onClick={() => toggleRef(binding.value.id)} className="text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors font-mono" style={{
                        background: "rgb(var(--color-surface2))",
                        color: "rgb(var(--color-text))",
                        border: "1px solid rgb(var(--color-border))",
                    }}>
                          {expandedRefs[binding.value.id] ? "hide" : "inspect"}
                        </button>)}
                    </div>

                    {/* Expandable Properties for Ref Objects */}
                    {typeof binding.value === "object" && binding.value?.type === "ref" && expandedRefs[binding.value.id] && heap[binding.value.id] && (
                      <div className="w-full mt-2 pt-2 border-t text-[11px] font-mono space-y-1" style={{ borderColor: "rgba(var(--color-border), 0.45)" }}>
                        <div className="flex items-center justify-between text-[10px] font-semibold" style={{ color: "rgb(var(--color-text-muted))" }}>
                          <span>{heap[binding.value.id].kind}: {heap[binding.value.id].label || "Object"}</span>
                          <span className="opacity-60">#{binding.value.id}</span>
                        </div>
                        {Object.entries(heap[binding.value.id].properties || {}).length === 0 ? (
                          <div className="italic text-[10px]" style={{ color: "rgb(var(--color-text-muted))" }}>Empty object</div>
                        ) : (
                          Object.entries(heap[binding.value.id].properties || {}).map(([propKey, propVal]) => (
                            <div key={propKey} className="flex items-center justify-between gap-2 px-1.5 py-0.5 rounded" style={{ background: "rgba(var(--color-surface), 0.5)" }}>
                              <span className="font-semibold" style={{ color: "rgb(var(--color-accent))" }}>{propKey}:</span>
                              <span style={{ color: "rgb(var(--color-text))" }}>{formatVal(propVal)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </motion.div>);
        }))}
          </div>

          {/* Creation -> Execution progress indicator */}
          <div className="pt-2 mt-2 border-t flex items-center justify-between text-[10px] font-mono shrink-0" style={{
            borderColor: "rgba(var(--color-border), 0.4)",
            color: "rgb(var(--color-text-muted))",
        }}>
            <span>Creation phase</span>
            <span style={{ color: "rgb(var(--color-accent))" }}>➔</span>
            <span>Execution phase</span>
          </div>
        </div>

        {/* ── RIGHT COLUMN: CODE (THREAD OF EXECUTION) ── */}
        <div className="flex flex-col min-h-0 overflow-hidden p-3.5">
          <div className="flex items-center justify-between pb-2 mb-2 border-b shrink-0" style={{ borderColor: "rgba(var(--color-border), 0.5)" }}>
            <span className="text-xs font-bold uppercase tracking-wider font-display" style={{ color: "rgb(var(--color-success))" }}>
              Code (Thread of Execution)
            </span>
            <span className="text-[11px] font-mono" style={{ color: "rgb(var(--color-text-muted))" }}>
              {activeLine ? `Line ${activeLine}` : "Paused"}
            </span>
          </div>

          {/* Code Lines with line numbers and pointer arrow */}
          <div className="flex-1 overflow-auto font-code text-[12px] leading-6 select-text space-y-0.5 pr-1">
            {contextLines.map((lineContent, idx) => {
            const lineNum = startLineNum + idx;
            const isExecuting = activeLine === lineNum;
            const isPast = activeLine !== null && lineNum < activeLine;
            return (<div key={lineNum} ref={isExecuting ? activeLineRef : undefined} className="flex items-start rounded-md px-1 py-0.5 transition-colors relative" style={{
                    background: isExecuting
                        ? "rgba(var(--color-accent), 0.22)"
                        : "transparent",
                    opacity: isPast ? 0.65 : 1,
                }}>
                  {/* Sliding Pointer Arrow ➜ */}
                  <div className="w-5 shrink-0 flex items-start justify-center pt-0.5">
                    {isExecuting && (<motion.span layoutId="contextLinePointer" className="font-bold text-xs" style={{ color: "rgb(var(--color-accent))" }} transition={{ type: "spring", stiffness: 450, damping: 30 }}>
                        ➜
                      </motion.span>)}
                  </div>

                  {/* Line Number */}
                  <span className="w-6 shrink-0 text-right pr-2 select-none font-mono text-[11px] pt-0.5" style={{
                    color: isExecuting
                        ? "rgb(var(--color-accent))"
                        : "rgb(var(--color-text-muted))",
                    fontWeight: isExecuting ? 700 : 400,
                }}>
                    {lineNum}
                  </span>

                  {/* Code Line Content with Syntax Highlighting */}
                  <span className="whitespace-pre-wrap break-words font-mono flex-1 min-w-0" style={{
                    color: isExecuting
                        ? "rgb(var(--color-text))"
                        : "rgba(var(--color-text), 0.9)",
                    fontWeight: isExecuting ? 600 : 400,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                }}>
                    {highlightJsLine(lineContent)}
                  </span>
                </div>);
        })}
          </div>

          {/* Bottom thread explanation hint */}
          <div className="pt-2 mt-2 border-t text-[10px] font-mono truncate shrink-0" style={{
            borderColor: "rgba(var(--color-border), 0.4)",
            color: "rgb(var(--color-text-muted))",
        }}>
            Thread of execution evaluates code line-by-line synchronously.
          </div>
        </div>
      </div>
    </motion.div>);
}
