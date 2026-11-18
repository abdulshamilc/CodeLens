// src/tools/dsv/topics/hashTable/HashTableVisualizer.jsx
// Progressive, beginner-friendly Hash Table visualizer with top explanation and step-by-step disclosure

import React, { useState, useEffect } from "react";
import { DSVStepController } from "../../components/DSVStepController";
import { DSV_COLORS } from "../../types";
import {
  generateChainingInsertSteps,
  generateProbingInsertSteps,
} from "./hashTableEngine";

const TABLE_CAPACITY = 5;

export function HashTableVisualizer({ type = "chaining" }) {
  const safeType = type || "chaining";
  const isChaining = safeType === "chaining";
  const isQuadratic = safeType === "quadratic-probing";

  const [buckets, setBuckets] = useState(() => Array.from({ length: TABLE_CAPACITY }, () => []));
  const [slots, setSlots] = useState(() => Array(TABLE_CAPACITY).fill(null));

  const [keyInput, setKeyInput] = useState("apple");
  const [valInput, setValInput] = useState(100);

  const [opCategory, setOpCategory] = useState(null); // "insert"

  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);

  useEffect(() => {
    setIsPlaying(false);
    setStepIdx(0);
    setOpCategory(null);
    const initialB = [[{ key: "cat", val: 50 }], [], [{ key: "dog", val: 75 }], [], []];
    const initialS = [{ key: "cat", val: 50 }, null, { key: "dog", val: 75 }, null, null];
    setBuckets(initialB);
    setSlots(initialS);

    setSteps([
      {
        buckets: initialB,
        slots: initialS,
        activeBucket: null,
        activeSlot: null,
        message: `${safeType.toUpperCase()} ready. Click "+ Insert Key-Value" below to hash and insert.`,
      },
    ]);
  }, [type, safeType]);

  const activeStep = steps[stepIdx] || steps[0] || {};

  const handleRunInsert = () => {
    if (!keyInput.trim()) return;
    setIsPlaying(false);

    let s = [];
    if (isChaining) {
      s = generateChainingInsertSteps(buckets, TABLE_CAPACITY, keyInput.trim(), valInput);
      setSteps(s);
      setStepIdx(0);
      setIsPlaying(true);
      const last = s[s.length - 1];
      if (last?.buckets) setBuckets(last.buckets);
    } else {
      s = generateProbingInsertSteps(slots, TABLE_CAPACITY, keyInput.trim(), valInput, isQuadratic);
      setSteps(s);
      setStepIdx(0);
      setIsPlaying(true);
      const last = s[s.length - 1];
      if (last?.slots) setSlots(last.slots);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setOpCategory(null);
    const emptyB = Array.from({ length: TABLE_CAPACITY }, () => []);
    const emptyS = Array(TABLE_CAPACITY).fill(null);
    setBuckets(emptyB);
    setSlots(emptyS);
    setSteps([
      {
        buckets: emptyB,
        slots: emptyS,
        activeBucket: null,
        activeSlot: null,
        message: "Hash Table reset to empty.",
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
              <span>Insert / Update Key-Value</span>
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
            <span className="text-slate-300 font-semibold">Store Entry:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Key:</span>
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                disabled={isPlaying}
                className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
                placeholder="key"
              />
            </div>
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
              disabled={isPlaying || !keyInput.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>▶</span>
              <span>Hash & Store</span>
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

      {/* ── 4. THE CANVAS ── */}
      <div className="w-full min-h-[260px] p-6 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col items-center justify-center gap-3 shadow-inner relative overflow-x-auto">
        {/* Separate Chaining View */}
        {isChaining && (
          <div className="flex flex-col gap-2 w-full max-w-xl">
            {(activeStep.buckets || buckets).map((bucket, idx) => {
              const isActiveBucket = activeStep.activeBucket === idx;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className={`w-12 h-10 rounded-lg border-2 font-mono flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      isActiveBucket
                        ? "border-sky-400 bg-sky-950/80 text-sky-200 scale-105 shadow-md"
                        : "border-slate-800 bg-slate-900/60 text-slate-400"
                    }`}
                  >
                    [{idx}]
                  </div>

                  <span className="text-slate-600 text-xs font-bold">→</span>

                  {bucket.length === 0 ? (
                    <span className="text-slate-600 font-mono text-[11px] italic">empty</span>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {bucket.map((entry, eIdx) => (
                        <div
                          key={eIdx}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 font-mono text-xs flex items-center gap-1 shadow-sm"
                        >
                          <span className="font-bold text-white">{entry.key}</span>
                          <span className="text-slate-500">:</span>
                          <span className="text-indigo-400">{entry.val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Probing (Open Addressing) View */}
        {!isChaining && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {(activeStep.slots || slots).map((entry, idx) => {
                const isActive = activeStep.activeSlot === idx;
                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-16 h-14 rounded-xl border-2 flex flex-col items-center justify-center font-mono text-xs transition-all duration-300 shadow-sm ${
                        isActive
                          ? "border-sky-400 bg-sky-950/70 text-sky-200 scale-105 shadow-md"
                          : entry
                          ? "border-slate-700 bg-slate-900/80 text-slate-100"
                          : "border-dashed border-slate-800 bg-slate-950/40 text-slate-600"
                      }`}
                    >
                      {entry ? (
                        <>
                          <span className="font-bold">{entry.key}</span>
                          <span className="text-[10px] text-indigo-400">{entry.val}</span>
                        </>
                      ) : (
                        <span className="text-[10px] italic">null</span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">[{idx}]</span>
                  </div>
                );
              })}
            </div>
            <span className="text-[11px] font-mono text-indigo-400 mt-2">
              Formula: {isQuadratic ? "(hash + i²) % capacity" : "(hash + i) % capacity"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default HashTableVisualizer;
