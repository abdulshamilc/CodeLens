// src/tools/dbv/components/stage/CodeCard.tsx
// Window-style code card with traffic light dots and animated sliding line pointer arrow
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useDBVStore } from "../../store/useDBVStore";
export function CodeCard() {
    const { code, trace, currentStep } = useDBVStore();
    const lines = useMemo(() => code.split("\n"), [code]);
    const activeLine = useMemo(() => {
        if (!trace || trace.length === 0)
            return null;
        const step = trace[currentStep];
        return step?.nodeRange?.startLine ?? null;
    }, [trace, currentStep]);
    return (<div className="flex flex-col rounded-2xl overflow-hidden border shadow-xl shrink-0 w-full lg:w-[380px] xl:w-[420px]" style={{
            background: "rgb(var(--color-panel-surface))",
            borderColor: "rgb(var(--color-panel-border))",
        }}>
      {/* Window Header with three dots */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b select-none shrink-0" style={{
            background: "rgb(var(--color-panel-surface2))",
            borderColor: "rgb(var(--color-panel-border))",
        }}>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="w-3 h-3 rounded-full" style={{ background: "rgb(var(--color-error))" }}/>
          <span className="w-3 h-3 rounded-full" style={{ background: "rgb(var(--color-warning))" }}/>
          <span className="w-3 h-3 rounded-full" style={{ background: "rgb(var(--color-success))" }}/>
        </div>
        <span className="text-xs font-mono font-medium" style={{ color: "rgb(var(--color-text-muted))" }}>
          main.js
        </span>
        <div className="w-8"/>
      </div>

      {/* Code Lines with Sliding Line Pointer Arrow */}
      <div className="p-3 overflow-auto font-code text-[13px] leading-6 relative select-text flex-1">
        {lines.map((lineContent, idx) => {
            const lineNum = idx + 1;
            const isActive = activeLine === lineNum;
            return (<div key={lineNum} className="relative flex items-center group transition-colors rounded-md px-1.5" style={{
                    background: isActive ? "rgba(var(--color-accent), 0.16)" : "transparent",
                }}>
              {/* Sliding Arrow Pointer */}
              <div className="w-5 shrink-0 flex items-center justify-center">
                {isActive && (<motion.span layoutId="codePointerArrow" className="font-bold text-sm" style={{ color: "rgb(var(--color-accent))" }} transition={{ type: "spring", stiffness: 450, damping: 30 }}>
                    ➜
                  </motion.span>)}
              </div>

              {/* Line Number */}
              <span className="w-7 shrink-0 text-right pr-2 select-none font-mono text-[11px]" style={{
                    color: isActive ? "rgb(var(--color-accent))" : "rgb(var(--color-text-muted))",
                    fontWeight: isActive ? 700 : 400,
                }}>
                {lineNum}
              </span>

              {/* Code text */}
              <span className="font-mono whitespace-pre flex-1" style={{
                    color: isActive ? "rgb(var(--color-text))" : "rgba(var(--color-text), 0.88)",
                    fontWeight: isActive ? 600 : 400,
                }}>
                {lineContent || " "}
              </span>
            </div>);
        })}
      </div>
    </div>);
}
