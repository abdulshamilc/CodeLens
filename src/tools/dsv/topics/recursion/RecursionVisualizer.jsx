// src/tools/dsv/topics/recursion/RecursionVisualizer.jsx
// Progressive, beginner-friendly Recursion visualizer with top explanation and step-by-step disclosure

import React, { useState, useEffect } from "react";
import { DSVStepController } from "../../components/DSVStepController";
import {
  generateFactorialSteps,
  generateFibonacciSteps,
} from "./recursionEngine";

export function RecursionVisualizer({ type = "factorial" }) {
  const safeType = type || "factorial";
  const isFib = safeType === "fibonacci";
  const [nInput, setNInput] = useState(4);
  const [opCategory, setOpCategory] = useState(null);

  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);

  useEffect(() => {
    setIsPlaying(false);
    setStepIdx(0);
    setOpCategory(null);
    const initialN = 4;
    setNInput(initialN);
    const s = isFib ? generateFibonacciSteps(initialN) : generateFactorialSteps(initialN);
    setSteps(s);
  }, [type, isFib]);

  const activeStep = steps[stepIdx] || steps[0] || {};

  const handleRunCompute = () => {
    setIsPlaying(false);
    const s = isFib ? generateFibonacciSteps(nInput) : generateFactorialSteps(nInput);
    setSteps(s);
    setStepIdx(0);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setOpCategory(null);
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
        {opCategory === null && (
          <div className="flex items-center gap-2 flex-wrap w-full">
            <button
              onClick={handleRunCompute}
              disabled={isPlaying}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>▶</span>
              <span>Trace {isFib ? "Fibonacci" : "Factorial"} (n={nInput})</span>
            </button>

            <button
              onClick={() => setOpCategory("change-n")}
              disabled={isPlaying}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ✏ Change n
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

        {opCategory === "change-n" && (
          <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
            <button
              onClick={() => setOpCategory(null)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ← Back
            </button>
            <span className="text-slate-300 font-semibold">Set Input n:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">n ({isFib ? "0..5" : "1..6"}):</span>
              <input
                type="number"
                min={isFib ? 0 : 1}
                max={isFib ? 5 : 6}
                value={nInput}
                onChange={(e) => setNInput(Number(e.target.value))}
                disabled={isPlaying}
                className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => {
                setOpCategory(null);
                handleRunCompute();
              }}
              disabled={isPlaying}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <span>▶</span>
              <span>Trace Stack</span>
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

      {/* ── 4. THE CANVAS (Call Stack Frames) ── */}
      <div className="w-full min-h-[260px] p-6 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col items-center justify-center shadow-inner">
        <div className="flex flex-col-reverse items-center gap-2 w-64 p-3 border-x-2 border-b-2 border-indigo-700/80 rounded-b-xl bg-slate-900/40 min-h-[210px] justify-start shadow-md">
          {(activeStep.frames || []).map((frame, idx) => (
            <div
              key={idx}
              className={`w-full p-2.5 rounded-lg border-2 font-mono text-xs flex items-center justify-between transition-all duration-300 shadow-sm ${
                frame.resolved
                  ? "border-emerald-500 bg-emerald-950/70 text-emerald-200"
                  : "border-sky-500 bg-sky-950/70 text-sky-200"
              }`}
            >
              <span className="font-bold">{frame.name}</span>
              <span className="text-[11px] font-bold">
                {frame.resolved ? `returns ${frame.returnVal}` : "waiting..."}
              </span>
            </div>
          ))}

          {(activeStep.frames || []).length === 0 && (
            <span className="text-slate-500 text-xs italic my-auto">
              Call Stack is empty (execution complete).
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecursionVisualizer;
