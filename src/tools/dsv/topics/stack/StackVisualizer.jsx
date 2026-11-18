// src/tools/dsv/topics/stack/StackVisualizer.jsx
// Progressive, beginner-friendly Stack visualizer with top explanation and step-by-step disclosure

import React, { useState, useEffect } from "react";
import { DSVStepController } from "../../components/DSVStepController";
import { DSV_COLORS } from "../../types";
import {
  generatePushSteps,
  generatePopSteps,
  generatePeekSteps,
} from "./stackEngine";

const INITIAL_STACK = [12, 24, 36];
const STACK_CAPACITY = 6;

export function StackVisualizer({ type = "array-stack" }) {
  const safeType = type || "array-stack";
  const isLL = safeType === "ll-stack";
  const [items, setItems] = useState(INITIAL_STACK);
  const [valInput, setValInput] = useState(48);

  const [opCategory, setOpCategory] = useState(null); // "push" | "pop" | "peek"

  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);

  useEffect(() => {
    setIsPlaying(false);
    setStepIdx(0);
    setOpCategory(null);
    setItems(INITIAL_STACK);
    setSteps([
      {
        items: INITIAL_STACK,
        capacity: STACK_CAPACITY,
        highlights: {},
        message: `${
          isLL ? "Linked-list-based" : "Array-based"
        } Stack ready. Choose "+ Push", "- Pop", or "Peek" below.`,
      },
    ]);
  }, [type]);

  const activeStep = steps[stepIdx] || steps[0] || {};
  const currentItems = activeStep.items || items;

  const commitSteps = (s) => {
    setSteps(s);
    setStepIdx(0);
    setIsPlaying(true);
    const last = s[s.length - 1];
    if (last?.items) {
      setItems(last.items);
    }
  };

  const handleRunPush = () => {
    const s = generatePushSteps(items, STACK_CAPACITY, valInput, isLL);
    commitSteps(s);
  };

  const handleRunPop = () => {
    const s = generatePopSteps(items, STACK_CAPACITY, isLL);
    commitSteps(s);
  };

  const handleRunPeek = () => {
    const s = generatePeekSteps(items, STACK_CAPACITY);
    setSteps(s);
    setStepIdx(0);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setOpCategory(null);
    setItems(INITIAL_STACK);
    setSteps([
      {
        items: INITIAL_STACK,
        capacity: STACK_CAPACITY,
        highlights: {},
        message: "Stack reset to initial 3 elements.",
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
              onClick={() => setOpCategory("push")}
              disabled={isPlaying}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>+</span>
              <span>Push (Add to Top)</span>
            </button>

            <button
              onClick={() => setOpCategory("pop")}
              disabled={isPlaying || currentItems.length === 0}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>-</span>
              <span>Pop (Remove from Top)</span>
            </button>

            <button
              onClick={() => setOpCategory("peek")}
              disabled={isPlaying || currentItems.length === 0}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer disabled:opacity-40"
            >
              👁 Peek Top
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

        {/* Push Sub-menu */}
        {opCategory === "push" && (
          <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
            <button
              onClick={() => setOpCategory(null)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ← Back
            </button>
            <span className="text-slate-300 font-semibold">Push to Stack:</span>
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
              onClick={handleRunPush}
              disabled={isPlaying}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>▶</span>
              <span>Push to Top</span>
            </button>
          </div>
        )}

        {/* Pop Sub-menu */}
        {opCategory === "pop" && (
          <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
            <button
              onClick={() => setOpCategory(null)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ← Back
            </button>
            <span className="text-slate-300 font-semibold">Pop Top Element:</span>
            <button
              onClick={handleRunPop}
              disabled={isPlaying || currentItems.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>🗑</span>
              <span>Pop Top Now</span>
            </button>
          </div>
        )}

        {/* Peek Sub-menu */}
        {opCategory === "peek" && (
          <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
            <button
              onClick={() => setOpCategory(null)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ← Back
            </button>
            <span className="text-slate-300 font-semibold">Inspect Top Element (O(1)):</span>
            <button
              onClick={handleRunPeek}
              disabled={isPlaying || currentItems.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>👁</span>
              <span>View Top Value</span>
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

      {/* ── 4. THE CANVAS (Vertical Beaker) ── */}
      <div className="w-full min-h-[260px] p-6 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col items-center justify-center gap-2 shadow-inner relative">
        <div className="flex flex-col items-center">
          {/* Beaker Container */}
          <div
            className="flex flex-col-reverse items-center justify-start p-2 rounded-b-2xl border-x-2 border-b-2 border-slate-700 bg-slate-900/40 w-44 sm:w-52 relative transition-all"
            style={{ minHeight: `${STACK_CAPACITY * 38 + 20}px` }}
          >
            {/* Empty message */}
            {currentItems.length === 0 && (
              <span className="text-slate-500 text-xs italic my-auto select-none">
                Stack is empty (TOP = -1)
              </span>
            )}

            {/* Elements stacked vertically */}
            {currentItems.map((val, idx) => {
              const isTop = idx === currentItems.length - 1;
              const status = activeStep.highlights?.[idx] || "default";

              let border = DSV_COLORS.default;
              let bg = "rgba(15, 23, 42, 0.8)";
              if (status === "newNode") {
                border = DSV_COLORS.newNode;
                bg = "rgba(168, 85, 247, 0.35)";
              } else if (status === "deleted") {
                border = DSV_COLORS.deleted;
                bg = "rgba(239, 68, 68, 0.35)";
              } else if (status === "found" || isTop) {
                border = DSV_COLORS.found;
                bg = "rgba(16, 185, 129, 0.25)";
              }

              return (
                <div
                  key={idx}
                  className="w-full my-1 px-3 py-2 rounded-xl border-2 font-mono flex items-center justify-between text-xs transition-all duration-300 shadow-sm relative"
                  style={{ borderColor: border, backgroundColor: bg }}
                >
                  <span className="font-bold text-white text-sm">{val}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-mono">[{idx}]</span>
                    {isTop && (
                      <span className="text-[10px] font-bold text-emerald-400 px-1 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 animate-pulse">
                        TOP
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <span className="text-[10px] font-mono text-slate-500 mt-2">
            Bottom of Stack (Closed End)
          </span>
        </div>
      </div>
    </div>
  );
}

export default StackVisualizer;
