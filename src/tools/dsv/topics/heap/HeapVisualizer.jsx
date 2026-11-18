// src/tools/dsv/topics/heap/HeapVisualizer.jsx
// Progressive, beginner-friendly Binary Heap visualizer with top explanation and step-by-step disclosure

import React, { useState, useEffect, useMemo } from "react";
import { DSVStepController } from "../../components/DSVStepController";
import { DSV_COLORS } from "../../types";
import {
  INITIAL_HEAP,
  layoutHeapTree,
  generateHeapInsertSteps,
  generateHeapExtractSteps,
} from "./heapEngine";

export function HeapVisualizer({ type = "min" }) {
  const safeType = type || "min";
  const isMinHeap = safeType !== "max";
  const [heap, setHeap] = useState(INITIAL_HEAP);
  const [valInput, setValInput] = useState(5);

  const [opCategory, setOpCategory] = useState(null); // "insert" | "extract"

  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);

  useEffect(() => {
    setIsPlaying(false);
    setStepIdx(0);
    setOpCategory(null);
    const initial = isMinHeap ? [10, 20, 15, 30, 40, 25] : [90, 75, 80, 50, 60, 70];
    setHeap(initial);
    setSteps([
      {
        heap: initial,
        highlights: {},
        message: `${
          isMinHeap ? "Min-Heap" : "Max-Heap"
        } ready. Notice how the complete binary tree directly mirrors the 1D array below.`,
      },
    ]);
  }, [type]);

  const activeStep = steps[stepIdx] || steps[0] || {};
  const currentHeap = activeStep.heap || heap;
  const { nodes, edges } = useMemo(() => layoutHeapTree(currentHeap, 560), [currentHeap]);

  const commitSteps = (s) => {
    setSteps(s);
    setStepIdx(0);
    setIsPlaying(true);
    const last = s[s.length - 1];
    if (last?.heap) {
      setHeap(last.heap);
    }
  };

  const handleRunInsert = () => {
    const s = generateHeapInsertSteps(heap, valInput, isMinHeap);
    commitSteps(s);
  };

  const handleRunExtract = () => {
    const s = generateHeapExtractSteps(heap, isMinHeap);
    commitSteps(s);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setOpCategory(null);
    const initial = isMinHeap ? [10, 20, 15, 30, 40, 25] : [90, 75, 80, 50, 60, 70];
    setHeap(initial);
    setSteps([
      {
        heap: initial,
        highlights: {},
        message: "Heap reset to initial 6 elements.",
      },
    ]);
    setStepIdx(0);
  };

  return (
    <div className="flex flex-col items-center gap-3.5 w-full max-w-4xl mx-auto select-none">
      {/* ── 1. TOP BEGINNER EXPLANATION BANNER ── */}
      <div className="w-full flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/90 border border-indigo-900/50 text-xs sm:text-sm text-slate-100 shadow-sm transition-all duration-300">
        <span className="text-base leading-none select-none">💡</span>
        <div className="flex-1 leading-relaxed">
          <span className="font-bold text-indigo-400 mr-1.5 uppercase text-[11px] tracking-wider">
            Step Explanation:
          </span>
          <span className="text-slate-200">
            {activeStep.message || "Select an operation below to see step-by-step visual execution."}
          </span>
        </div>
      </div>

      {/* ── 2. PROGRESSIVE OPERATION BAR ── */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-slate-800 bg-slate-900/60 w-full text-xs">
        {/* Main Selection */}
        {opCategory === null && (
          <div className="flex items-center gap-2 flex-wrap w-full">
            <span className="text-slate-400 font-medium mr-1">Choose Operation:</span>
            <button
              onClick={() => setOpCategory("insert")}
              disabled={isPlaying}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>+</span>
              <span>Insert Element (Heapify Up)</span>
            </button>

            <button
              onClick={() => setOpCategory("extract")}
              disabled={isPlaying || currentHeap.length === 0}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>-</span>
              <span>Extract Root (Heapify Down)</span>
            </button>

            <button
              onClick={handleReset}
              disabled={isPlaying}
              className="ml-auto px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer disabled:opacity-40"
            >
              ↺ Reset
            </button>
          </div>
        )}

        {/* Insert Sub-menu */}
        {opCategory === "insert" && (
          <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
            <button
              onClick={() => setOpCategory(null)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ← Back
            </button>
            <span className="text-slate-300 font-semibold">
              Insert into {isMinHeap ? "Min-Heap" : "Max-Heap"}:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Value:</span>
              <input
                type="number"
                value={valInput}
                onChange={(e) => setValInput(e.target.value)}
                disabled={isPlaying}
                className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleRunInsert}
              disabled={isPlaying}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>▶</span>
              <span>Insert & Bubble Up</span>
            </button>
          </div>
        )}

        {/* Extract Sub-menu */}
        {opCategory === "extract" && (
          <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
            <button
              onClick={() => setOpCategory(null)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ← Back
            </button>
            <span className="text-slate-300 font-semibold">
              Extract {isMinHeap ? "Minimum" : "Maximum"} Root ({currentHeap[0]}):
            </span>
            <button
              onClick={handleRunExtract}
              disabled={isPlaying || currentHeap.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>🗑</span>
              <span>Extract & Sift Down</span>
            </button>
          </div>
        )}
      </div>

      {/* ── 3. CONTROLLER (Only Play + Speed) ── */}
      <DSVStepController
        currentStep={stepIdx}
        totalSteps={steps.length}
        isPlaying={isPlaying}
        onPlayPause={setIsPlaying}
        onStepChange={setStepIdx}
        speed={speed}
        onSpeedChange={setSpeed}
      />

      {/* ── 4. THE CANVAS (Dual Tree & Array Views) ── */}
      <div className="w-full min-h-[340px] p-4 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col items-center justify-between gap-4 shadow-inner relative overflow-hidden">
        {/* Tree SVG */}
        <div className="w-full flex justify-center">
          {nodes.length === 0 ? (
            <span className="text-slate-500 text-xs italic my-8">Heap is empty.</span>
          ) : (
            <svg className="w-full max-w-[560px] h-[200px]" viewBox="0 0 560 200">
              {/* Edges */}
              {edges.map((e) => (
                <line
                  key={e.id}
                  x1={e.x1}
                  y1={e.y1}
                  x2={e.x2}
                  y2={e.y2}
                  stroke="#334155"
                  strokeWidth="2"
                />
              ))}

              {/* Nodes */}
              {nodes.map((n) => {
                const status = activeStep.highlights?.[n.idx] || "default";
                let fill = "#0f172a";
                let stroke = "#3b82f6";
                if (status === "active") {
                  fill = "rgba(56, 189, 248, 0.4)";
                  stroke = "#38bdf8";
                } else if (status === "comparing") {
                  fill = "rgba(245, 158, 11, 0.4)";
                  stroke = "#f59e0b";
                } else if (status === "swapping") {
                  fill = "rgba(249, 115, 22, 0.5)";
                  stroke = "#f97316";
                }

                return (
                  <g key={n.id} className="transition-all duration-300">
                    <circle cx={n.x} cy={n.y} r={17} fill={fill} stroke={stroke} strokeWidth={2.5} />
                    <text
                      x={n.x}
                      y={n.y + 4}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {n.val}
                    </text>
                    <text
                      x={n.x}
                      y={n.y - 20}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      [{n.idx}]
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Array representation */}
        <div className="w-full flex flex-col items-center gap-1.5 pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Array Representation (Left: 2i+1, Right: 2i+2)
          </span>
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {currentHeap.map((val, idx) => {
              const status = activeStep.highlights?.[idx] || "default";
              let border = DSV_COLORS.default;
              let bg = "rgba(15, 23, 42, 0.6)";

              if (status === "active") {
                border = DSV_COLORS.active;
                bg = "rgba(56, 189, 248, 0.3)";
              } else if (status === "swapping") {
                border = DSV_COLORS.swapping;
                bg = "rgba(249, 115, 22, 0.4)";
              }

              return (
                <div key={idx} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-10 h-10 rounded-lg border-2 flex items-center justify-center font-mono font-bold text-xs text-slate-100 shadow-sm transition-all"
                    style={{ borderColor: border, backgroundColor: bg }}
                  >
                    {val}
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">[{idx}]</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeapVisualizer;
