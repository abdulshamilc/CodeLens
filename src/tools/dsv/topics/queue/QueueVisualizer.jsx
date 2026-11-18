// src/tools/dsv/topics/queue/QueueVisualizer.jsx
// Progressive, beginner-friendly Queue visualizer with top explanation and step-by-step disclosure

import React, { useState, useEffect } from "react";
import { DSVStepController } from "../../components/DSVStepController";
import { DSV_COLORS } from "../../types";
import {
  generateEnqueueSteps,
  generateDequeueSteps,
  generateDequeSteps,
  generatePriorityQueueSteps,
} from "./queueEngine";

const INITIAL_QUEUE = [10, 20, 30];
const QUEUE_CAP = 6;

export function QueueVisualizer({ type = "simple" }) {
  const [items, setItems] = useState(INITIAL_QUEUE);
  const [priorityItems, setPriorityItems] = useState([
    { val: 10, priority: 3 },
    { val: 20, priority: 1 },
    { val: 30, priority: 2 },
  ]);

  const [valInput, setValInput] = useState(40);
  const [prioInput, setPrioInput] = useState(1);

  // Progressive Disclosure
  const [opCategory, setOpCategory] = useState(null); // "enqueue" | "dequeue" | "add" | "remove"
  const [dequeTarget, setDequeTarget] = useState(null); // "front" | "back"

  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);

  const safeType = type || "simple";
  const isCircular = safeType === "circular";
  const isDeque = safeType === "deque";
  const isPriority = safeType === "priority";

  useEffect(() => {
    setIsPlaying(false);
    setStepIdx(0);
    setOpCategory(null);
    setDequeTarget(null);
    setItems(INITIAL_QUEUE);
    setSteps([
      {
        items: isPriority ? priorityItems.sort((a, b) => a.priority - b.priority) : INITIAL_QUEUE,
        capacity: QUEUE_CAP,
        highlights: {},
        message: `${safeType.toUpperCase()} Queue ready. Select an operation below.`,
      },
    ]);
  }, [type, isPriority, safeType]);

  const activeStep = steps[stepIdx] || steps[0] || {};
  const currentList = activeStep.items || items;

  const commitSteps = (s) => {
    setSteps(s);
    setStepIdx(0);
    setIsPlaying(true);
    const last = s[s.length - 1];
    if (last?.items) {
      if (isPriority) setPriorityItems(last.items);
      else setItems(last.items);
    }
  };

  const handleRunEnqueue = () => {
    if (isPriority) {
      const s = generatePriorityQueueSteps(priorityItems, valInput, prioInput);
      commitSteps(s);
    } else {
      const s = generateEnqueueSteps(items, QUEUE_CAP, valInput, isCircular);
      commitSteps(s);
    }
  };

  const handleRunDequeue = () => {
    if (isPriority) {
      if (priorityItems.length === 0) return;
      const s = [
        {
          items: priorityItems.slice(1),
          highlights: {},
          message: `Extracted highest priority item (${priorityItems[0].val}, priority ${priorityItems[0].priority}).`,
        },
      ];
      commitSteps(s);
    } else {
      const s = generateDequeueSteps(items, QUEUE_CAP);
      commitSteps(s);
    }
  };

  const handleRunDequeAction = (action) => {
    const s = generateDequeSteps(items, QUEUE_CAP, action, valInput);
    commitSteps(s);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setOpCategory(null);
    setDequeTarget(null);
    setItems(INITIAL_QUEUE);
    setSteps([
      {
        items: INITIAL_QUEUE,
        capacity: QUEUE_CAP,
        highlights: {},
        message: "Queue reset to default 3 elements.",
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
        {/* Simple & Circular Queue */}
        {!isDeque && !isPriority && (
          <>
            {opCategory === null && (
              <div className="flex items-center gap-2 flex-wrap w-full">
                <span className="text-slate-400 font-medium mr-1">Choose Operation:</span>
                <button
                  onClick={() => setOpCategory("enqueue")}
                  disabled={isPlaying}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
                >
                  <span>+</span>
                  <span>Enqueue (Add to Rear)</span>
                </button>

                <button
                  onClick={() => setOpCategory("dequeue")}
                  disabled={isPlaying || currentList.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
                >
                  <span>-</span>
                  <span>Dequeue (Remove from Front)</span>
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

            {opCategory === "enqueue" && (
              <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
                <button
                  onClick={() => setOpCategory(null)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
                >
                  ← Back
                </button>
                <span className="text-slate-300 font-semibold">Enqueue at Rear:</span>
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
                  onClick={handleRunEnqueue}
                  disabled={isPlaying}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
                >
                  <span>▶</span>
                  <span>Enqueue Node</span>
                </button>
              </div>
            )}

            {opCategory === "dequeue" && (
              <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
                <button
                  onClick={() => setOpCategory(null)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
                >
                  ← Back
                </button>
                <span className="text-slate-300 font-semibold">Dequeue Front Element:</span>
                <button
                  onClick={handleRunDequeue}
                  disabled={isPlaying || currentList.length === 0}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
                >
                  <span>🗑</span>
                  <span>Dequeue Front Now</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Deque (Double-Ended Queue) */}
        {isDeque && (
          <div className="flex items-center gap-2 flex-wrap w-full">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Val:</span>
              <input
                type="number"
                value={valInput}
                onChange={(e) => setValInput(e.target.value)}
                disabled={isPlaying}
                className="w-14 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => handleRunDequeAction("pushFront")}
              disabled={isPlaying}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition cursor-pointer"
            >
              + Push Front
            </button>
            <button
              onClick={() => handleRunDequeAction("pushBack")}
              disabled={isPlaying}
              className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition cursor-pointer"
            >
              + Push Back
            </button>
            <button
              onClick={() => handleRunDequeAction("popFront")}
              disabled={isPlaying || currentList.length === 0}
              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition cursor-pointer disabled:opacity-40"
            >
              - Pop Front
            </button>
            <button
              onClick={() => handleRunDequeAction("popBack")}
              disabled={isPlaying || currentList.length === 0}
              className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition cursor-pointer disabled:opacity-40"
            >
              - Pop Back
            </button>
            <button
              onClick={handleReset}
              disabled={isPlaying}
              className="ml-auto px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition cursor-pointer"
            >
              ↺ Reset
            </button>
          </div>
        )}

        {/* Priority Queue */}
        {isPriority && (
          <div className="flex items-center gap-2 flex-wrap w-full">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Val:</span>
              <input
                type="number"
                value={valInput}
                onChange={(e) => setValInput(e.target.value)}
                disabled={isPlaying}
                className="w-14 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Priority:</span>
              <input
                type="number"
                value={prioInput}
                onChange={(e) => setPrioInput(e.target.value)}
                disabled={isPlaying}
                className="w-12 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none"
              />
            </div>
            <button
              onClick={handleRunEnqueue}
              disabled={isPlaying}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer"
            >
              + Insert with Priority
            </button>
            <button
              onClick={handleRunDequeue}
              disabled={isPlaying || priorityItems.length === 0}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer disabled:opacity-40"
            >
              - Extract Highest
            </button>
            <button
              onClick={handleReset}
              disabled={isPlaying}
              className="ml-auto px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition cursor-pointer"
            >
              ↺ Reset
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
      <div className="w-full min-h-[220px] p-6 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col items-center justify-center gap-4 overflow-x-auto shadow-inner relative">
        {/* Simple & Deque Linear Horizontal Tube */}
        {!isCircular && (
          <div className="flex items-center justify-center gap-2 py-4 px-2 min-w-max">
            {currentList.length === 0 ? (
              <span className="text-slate-500 text-xs italic">
                Queue is empty (FRONT = -1, REAR = -1)
              </span>
            ) : (
              currentList.map((item, idx) => {
                const val = typeof item === "object" ? item.val : item;
                const prio = typeof item === "object" ? item.priority : null;
                const isFront = idx === 0;
                const isRear = idx === currentList.length - 1;
                const status = activeStep.highlights?.[idx] || "default";

                let border = DSV_COLORS.default;
                let bg = "rgba(15, 23, 42, 0.7)";
                if (status === "newNode") {
                  border = DSV_COLORS.newNode;
                  bg = "rgba(168, 85, 247, 0.25)";
                } else if (status === "deleted") {
                  border = DSV_COLORS.deleted;
                  bg = "rgba(239, 68, 68, 0.25)";
                }

                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div className="h-4 flex items-center justify-center">
                      {isFront && (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 px-1 rounded bg-emerald-950/60 border border-emerald-800/60">
                          FRONT
                        </span>
                      )}
                      {isRear && !isFront && (
                        <span className="text-[10px] font-mono font-bold text-amber-400 px-1 rounded bg-amber-950/60 border border-amber-800/60">
                          REAR
                        </span>
                      )}
                    </div>

                    <div
                      className="w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center font-mono shadow-sm transition-all duration-300"
                      style={{ borderColor: border, backgroundColor: bg }}
                    >
                      <span className="font-bold text-white text-sm">{val}</span>
                      {prio !== null && (
                        <span className="text-[9px] text-amber-400 font-bold">p:{prio}</span>
                      )}
                    </div>

                    <span className="text-[10px] font-mono text-slate-500">[{idx}]</span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Circular Queue Ring */}
        {isCircular && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {Array.from({ length: QUEUE_CAP }).map((_, slotIdx) => {
                const hasItem = slotIdx < currentList.length;
                const val = currentList[slotIdx];
                const isFront = slotIdx === 0 && currentList.length > 0;
                const isRear = slotIdx === currentList.length - 1 && currentList.length > 0;

                return (
                  <div key={slotIdx} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-12 h-12 rounded-xl border-2 flex flex-col items-center justify-center font-mono font-bold text-xs transition-all ${
                        hasItem
                          ? "border-sky-500 bg-sky-950/40 text-sky-200 shadow-sm"
                          : "border-slate-800 border-dashed bg-slate-900/30 text-slate-600"
                      }`}
                    >
                      {hasItem ? val : "—"}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">[{slotIdx}]</span>
                    {isFront && (
                      <span className="text-[9px] font-bold text-emerald-400">FRONT</span>
                    )}
                    {isRear && (
                      <span className="text-[9px] font-bold text-amber-400">REAR</span>
                    )}
                  </div>
                );
              })}
            </div>
            <span className="text-[11px] font-mono text-indigo-400 mt-2">
              Formula: (rear + 1) % {QUEUE_CAP}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default QueueVisualizer;
