// src/tools/dbv/components/panels/CallStackPanel.tsx
// Visualization of the call stack (execution context frames)
// with animated push/pop, phase badge, variable table, and outer-env link.
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDBVStore } from "../../store/useDBVStore";
import { PanelWrapper } from "./PanelWrapper";
function isRef(v) {
    return typeof v === "object" && v !== null && v.type === "ref";
}
function displayValue(v) {
    if (v === undefined)
        return { text: "undefined", color: "#94a3b8" };
    if (v === null)
        return { text: "null", color: "#94a3b8" };
    if (typeof v === "boolean")
        return { text: String(v), color: "#f59e0b" };
    if (typeof v === "number")
        return { text: String(v), color: "#22c55e" };
    if (typeof v === "string") {
        // Could be a built-in string like "[built-in: console]"
        if (v.startsWith("["))
            return { text: v, color: "#94a3b8" };
        return { text: `"${v}"`, color: "#f97316" };
    }
    if (isRef(v))
        return { text: `[Object: ${v.id}]`, color: "#8b5cf6" };
    return { text: String(v), color: "#94a3b8" };
}
function BindingRow({ name, binding, isChanged, }) {
    const kindColor = {
        var: "#94a3b8",
        let: "#22c55e",
        const: "#ef4444",
        function: "#d946ef",
        param: "#3b82f6",
        class: "#f59e0b",
        import: "#06b6d4",
    };
    const isTDZ = binding.state === "uninitialized";
    const { text, color } = displayValue(binding.value);
    return (<motion.tr initial={isChanged ? { backgroundColor: "rgba(99,102,241,0.3)" } : false} animate={{ backgroundColor: "rgba(99,102,241,0)" }} transition={{ duration: 0.6 }} className="border-b last:border-0" style={{ borderColor: "rgba(var(--color-border), 0.3)" }}>
      {/* Kind badge */}
      <td className="py-1 pr-1.5 w-14">
        <span className="inline-block text-[10px] px-1 py-0.5 rounded font-code font-semibold" style={{
            background: `${kindColor[binding.kind] ?? "#64748b"}22`,
            color: kindColor[binding.kind] ?? "#64748b",
        }}>
          {binding.kind}
        </span>
      </td>
      {/* Name */}
      <td className="py-1 pr-2 font-code text-xs" style={{ color: "rgb(var(--color-text))" }}>
        {name}
      </td>
      {/* Value */}
      <td className="py-1 font-code text-xs">
        {isTDZ ? (<span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
            TDZ ⚠️
          </span>) : (<span style={{ color }}>{text}</span>)}
      </td>
    </motion.tr>);
}
function ContextFrame({ ctx, env, changedBindings, isTop, }) {
    const phaseColor = ctx.phase === "Creation" ? "#f59e0b" : "#6366f1";
    const typeColors = {
        Global: "#22c55e",
        Function: "#8b5cf6",
        Block: "#06b6d4",
        Module: "#f59e0b",
        Eval: "#ef4444",
    };
    const bindings = env?.bindings ?? {};
    const bindingEntries = Object.entries(bindings);
    return (<motion.div layout initial={{ opacity: 0, y: -16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.95 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} className="rounded-xl overflow-hidden" style={{
            border: isTop
                ? `2px solid rgba(${typeColors[ctx.type] ? typeColors[ctx.type].replace("#", "") : "99,102,241"}, 0.6)`
                : `1px solid rgba(var(--color-border), 0.5)`,
            background: isTop ? "rgba(var(--color-surface2), 0.6)" : "rgba(var(--color-surface), 0.4)",
            boxShadow: isTop ? `0 0 16px rgba(99,102,241,0.15)` : "none",
        }}>
      {/* Frame header */}
      <div className="flex items-center justify-between px-3 py-2" style={{
            background: isTop
                ? "rgba(var(--color-surface2), 0.8)"
                : "rgba(var(--color-surface), 0.6)",
            borderBottom: "1px solid rgba(var(--color-border), 0.3)",
        }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{
            background: `${typeColors[ctx.type] ?? "#6366f1"}22`,
            color: typeColors[ctx.type] ?? "#6366f1",
        }}>
            {ctx.type}
          </span>
          <span className="font-code text-xs font-semibold" style={{ color: "rgb(var(--color-text))" }}>
            {ctx.name}()
          </span>
          {isTop && (<span className="text-[10px]" style={{ color: "#94a3b8" }}>
              ← current
            </span>)}
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${phaseColor}22`, color: phaseColor }}>
          {ctx.phase}
        </span>
      </div>

      {/* Variable table */}
      {bindingEntries.length > 0 && (<div className="px-3 py-2 overflow-auto max-h-48">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-[9px] uppercase tracking-wider pb-1" style={{ color: "rgb(var(--color-text-muted))" }}>kind</th>
                <th className="text-left text-[9px] uppercase tracking-wider pb-1" style={{ color: "rgb(var(--color-text-muted))" }}>name</th>
                <th className="text-left text-[9px] uppercase tracking-wider pb-1" style={{ color: "rgb(var(--color-text-muted))" }}>value</th>
              </tr>
            </thead>
            <tbody>
              {bindingEntries
                .filter(([name]) => !name.startsWith("__"))
                .map(([name, binding]) => (<BindingRow key={name} name={name} binding={binding} isChanged={changedBindings.includes(`${env?.id}/${name}`)}/>))}
            </tbody>
          </table>
        </div>)}

      {/* This + line */}
      <div className="px-3 py-1.5 flex items-center gap-3 text-[11px]" style={{ borderTop: bindingEntries.length > 0 ? "1px solid rgba(var(--color-border), 0.3)" : "none" }}>
        <span style={{ color: "rgb(var(--color-text-muted))" }}>
          this: <span className="font-code" style={{ color: "#f97316" }}>
            {ctx.thisBinding === undefined
            ? "undefined"
            : ctx.thisBinding === null
                ? "null"
                : "[Window/Global]"}
          </span>
        </span>
        <span style={{ color: "rgb(var(--color-text-muted))" }}>
          line: <span className="font-code" style={{ color: "rgb(var(--color-text))" }}>{ctx.sourceLine}</span>
        </span>
      </div>
    </motion.div>);
}
export function CallStackPanel() {
    const { trace, currentStep } = useDBVStore();
    const step = trace[currentStep];
    if (!step) {
        return (<PanelWrapper id="callstack" title="📚 Call Stack">
        <div className="flex items-center justify-center h-24 text-sm" style={{ color: "rgb(var(--color-text-muted))" }}>
          Run code to see the call stack
        </div>
      </PanelWrapper>);
    }
    const { callStack, environments, changedBindings } = step;
    return (<PanelWrapper id="callstack" title="📚 Call Stack / Execution Contexts">
      <div className="flex flex-col gap-2 p-2">
        <AnimatePresence mode="popLayout">
          {[...callStack].reverse().map((ctx, idx) => (<ContextFrame key={ctx.id} ctx={ctx} env={environments[ctx.lexicalEnvId]} changedBindings={changedBindings} isTop={idx === 0}/>))}
        </AnimatePresence>
        {callStack.length === 0 && (<div className="text-center py-4 text-xs" style={{ color: "rgb(var(--color-text-muted))" }}>
            Call stack is empty
          </div>)}
      </div>
    </PanelWrapper>);
}
