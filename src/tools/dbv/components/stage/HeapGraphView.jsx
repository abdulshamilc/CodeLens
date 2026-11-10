// src/tools/dbv/components/stage/HeapGraphView.jsx
// Interactive SVG Heap Reference Graph: Displays variables and heap objects with animated SVG pointer curves

import React, { useState } from "react";
import { getVarColorVar } from "../../utils/varColors";

export function HeapGraphView({ userBindings = [], heap = {}, changedBindings = [] }) {
  const [hoveredVar, setHoveredVar] = useState(null);
  const [hoveredHeapId, setHoveredHeapId] = useState(null);

  // Filter heap objects that are relevant: either directly referenced by variables or referenced by objects
  const referencedHeapIds = new Set();
  userBindings.forEach(({ binding }) => {
    if (binding?.value?.type === "ref") {
      referencedHeapIds.add(binding.value.id);
    }
  });

  // Also include prototypes or nested object refs
  Object.values(heap).forEach((obj) => {
    if (referencedHeapIds.has(obj.id)) {
      if (obj.prototype?.type === "ref") referencedHeapIds.add(obj.prototype.id);
      if (obj.properties) {
        Object.values(obj.properties).forEach((p) => {
          if (p?.type === "ref") referencedHeapIds.add(p.id);
        });
      }
    }
  });

  const heapObjects = Object.values(heap).filter((h) => referencedHeapIds.has(h.id));

  // If no heap objects exist
  if (userBindings.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs italic" style={{ color: "rgb(var(--color-text-muted))" }}>
        No variables in current scope
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto p-2 text-xs font-mono select-none">
      <div className="grid grid-cols-2 gap-3 min-h-full">
        {/* ── Left Column: Variables / Stack Pointers ── */}
        <div className="flex flex-col gap-2 border-r pr-2" style={{ borderColor: "rgba(var(--color-border), 0.4)" }}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b" style={{ borderColor: "rgba(var(--color-border), 0.3)" }}>
            Stack / Scope Bindings
          </div>
          {userBindings.map(({ name, binding }) => {
            const isRef = binding?.value?.type === "ref";
            const targetId = isRef ? binding.value.id : null;
            const varColor = getVarColorVar(name);
            const isHovered = hoveredVar === name || (targetId && hoveredHeapId === targetId);

            return (
              <div
                key={name}
                onMouseEnter={() => {
                  setHoveredVar(name);
                  if (targetId) setHoveredHeapId(targetId);
                }}
                onMouseLeave={() => {
                  setHoveredVar(null);
                  setHoveredHeapId(null);
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isHovered ? "ring-2 ring-indigo-500 bg-indigo-950/40 shadow-lg" : "bg-slate-900/60 hover:bg-slate-800/60"
                }`}
                style={{
                  borderColor: isHovered ? "rgb(99, 102, 241)" : "rgba(148, 163, 184, 0.2)",
                }}
              >
                <div>
                  <div className="font-bold text-xs" style={{ color: varColor }}>
                    {name}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {binding.kind}
                  </div>
                </div>

                {isRef ? (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px]">
                    <span>ref ➜</span>
                    <span className="font-bold">{targetId}</span>
                  </div>
                ) : (
                  <div className="text-slate-300 font-semibold truncate max-w-[100px]">
                    {String(binding.value)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Right Column: Heap Objects ── */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b" style={{ borderColor: "rgba(var(--color-border), 0.3)" }}>
            Heap Memory Objects
          </div>
          {heapObjects.length === 0 ? (
            <div className="py-8 text-center text-[11px] text-slate-500 italic">
              All variables in scope are primitives (no Heap allocations)
            </div>
          ) : (
            heapObjects.map((obj) => {
              const isTargetHovered = hoveredHeapId === obj.id;

              return (
                <div
                  key={obj.id}
                  onMouseEnter={() => setHoveredHeapId(obj.id)}
                  onMouseLeave={() => setHoveredHeapId(null)}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isTargetHovered
                      ? "ring-2 ring-indigo-500 bg-slate-800/90 shadow-xl"
                      : "bg-slate-900/70"
                  }`}
                  style={{
                    borderColor: isTargetHovered ? "rgb(99, 102, 241)" : "rgba(148, 163, 184, 0.25)",
                  }}
                >
                  <div className="flex items-center justify-between border-b pb-1 mb-1.5" style={{ borderColor: "rgba(148, 163, 184, 0.2)" }}>
                    <span className="text-[10px] font-bold text-indigo-400">
                      @{obj.id} ({obj.kind})
                    </span>
                    {obj.prototype && (
                      <span className="text-[9px] text-slate-400">
                        proto: {obj.prototype.id || "Object"}
                      </span>
                    )}
                  </div>

                  {/* Properties table */}
                  <div className="space-y-1">
                    {obj.properties && Object.keys(obj.properties).length > 0 ? (
                      Object.entries(obj.properties).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">{k}:</span>
                          <span className="text-emerald-400 font-semibold truncate max-w-[120px]">
                            {typeof v === "object" && v?.type === "ref" ? `ref(@${v.id})` : String(v)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] text-slate-500 italic">
                        {obj.kind === "function" ? `ƒ ${obj.label || "anonymous"}()` : "{ } empty"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
