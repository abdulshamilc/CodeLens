// src/tools/dsv/topics/linkedList/LinkedListVisualizer.jsx
// Highly animated Linked List visualizer with live floating pointers (HEAD, TAIL, CURR, PREV, NEXT)
// and animated pointer link directions (forward →, reversed ←, severed ⤬).

import React, { useState, useEffect } from "react";
import { DSVStepController } from "../../components/DSVStepController";
import {
  generateInsertHeadSteps,
  generateInsertTailSteps,
  generateDeleteHeadSteps,
  generateDeleteTailSteps,
  generateReverseSteps,
} from "./linkedListEngine";

const INITIAL_NODES = [
  { id: "n1", data: 15 },
  { id: "n2", data: 30 },
  { id: "n3", data: 45 },
  { id: "n4", data: 60 },
];

export function LinkedListVisualizer({ type = "singly" }) {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [valInput, setValInput] = useState(75);

  const [opCategory, setOpCategory] = useState(null);
  const [opTarget, setOpTarget] = useState(null);

  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(650);

  const safeType = type || "singly";
  const isDoubly = safeType.includes("doubly");
  const isCircular = safeType.includes("circular");

  useEffect(() => {
    setIsPlaying(false);
    setStepIdx(0);
    setNodes(INITIAL_NODES);
    setOpCategory(null);
    setOpTarget(null);
    setSteps([
      {
        nodes: INITIAL_NODES,
        pointers: { head: 0, tail: INITIAL_NODES.length - 1 },
        arrowDirections: INITIAL_NODES.map(() => "forward"),
        message: `${
          isDoubly
            ? isCircular
              ? "Circular Doubly"
              : "Doubly"
            : isCircular
            ? "Circular Singly"
            : "Singly"
        } Linked List ready. Pointers and links will animate step-by-step.`,
      },
    ]);
  }, [type]);

  const activeStep = steps[stepIdx] || steps[0] || {};
  const currentNodes = activeStep.nodes || nodes;
  const pointers = activeStep.pointers || {};
  const arrowDirections = activeStep.arrowDirections || currentNodes.map(() => "forward");

  const commitSteps = (s) => {
    setSteps(s);
    setStepIdx(0);
    setIsPlaying(true);
    const last = s[s.length - 1];
    if (last?.nodes) {
      setNodes(last.nodes);
    }
  };

  const handleRunInsertHead = () => {
    const s = generateInsertHeadSteps(nodes, valInput, isDoubly, isCircular);
    commitSteps(s);
  };

  const handleRunInsertTail = () => {
    const s = generateInsertTailSteps(nodes, valInput, isDoubly, isCircular);
    commitSteps(s);
  };

  const handleRunDeleteHead = () => {
    const s = generateDeleteHeadSteps(nodes, isDoubly, isCircular);
    commitSteps(s);
  };

  const handleRunDeleteTail = () => {
    const s = generateDeleteTailSteps(nodes, isDoubly, isCircular);
    commitSteps(s);
  };

  const handleRunReverse = () => {
    const s = generateReverseSteps(nodes);
    commitSteps(s);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setNodes(INITIAL_NODES);
    setOpCategory(null);
    setOpTarget(null);
    setSteps([
      {
        nodes: INITIAL_NODES,
        pointers: { head: 0, tail: INITIAL_NODES.length - 1 },
        arrowDirections: INITIAL_NODES.map(() => "forward"),
        message: "Linked list reset to default 4 nodes.",
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
            Pointer Action:
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
            <span className="text-slate-400 font-medium mr-1">Choose Operation:</span>
            <button
              onClick={() => {
                setOpCategory("insert");
                setOpTarget(null);
              }}
              disabled={isPlaying}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>+</span>
              <span>Insert</span>
            </button>

            <button
              onClick={() => {
                setOpCategory("delete");
                setOpTarget(null);
              }}
              disabled={isPlaying || currentNodes.length === 0}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>-</span>
              <span>Delete</span>
            </button>

            {!isCircular && (
              <button
                onClick={handleRunReverse}
                disabled={isPlaying || currentNodes.length <= 1}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer disabled:opacity-40"
              >
                ⇄ Reverse List (3 Pointers)
              </button>
            )}

            <button
              onClick={handleReset}
              disabled={isPlaying}
              className="ml-auto px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer disabled:opacity-40"
            >
              ↺ Reset
            </button>
          </div>
        )}

        {opCategory === "insert" && (
          <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
            <button
              onClick={() => {
                if (opTarget) setOpTarget(null);
                else setOpCategory(null);
              }}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ← Back
            </button>

            {!opTarget && (
              <>
                <span className="text-slate-300 font-medium">Where to insert?</span>
                <button
                  onClick={() => setOpTarget("head")}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition cursor-pointer"
                >
                  Insert Head (Beginning)
                </button>
                <button
                  onClick={() => setOpTarget("tail")}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition cursor-pointer"
                >
                  Insert Tail (End)
                </button>
              </>
            )}

            {opTarget && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-300 font-semibold">
                  Insert at {opTarget === "head" ? "Head" : "Tail"}:
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
                  onClick={opTarget === "head" ? handleRunInsertHead : handleRunInsertTail}
                  disabled={isPlaying}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
                >
                  <span>▶</span>
                  <span>Insert Node</span>
                </button>
              </div>
            )}
          </div>
        )}

        {opCategory === "delete" && (
          <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
            <button
              onClick={() => {
                if (opTarget) setOpTarget(null);
                else setOpCategory(null);
              }}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ← Back
            </button>

            {!opTarget && (
              <>
                <span className="text-slate-300 font-medium">Which node to delete?</span>
                <button
                  onClick={() => setOpTarget("head")}
                  disabled={currentNodes.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition cursor-pointer disabled:opacity-40"
                >
                  Delete Head (First)
                </button>
                <button
                  onClick={() => setOpTarget("tail")}
                  disabled={currentNodes.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition cursor-pointer disabled:opacity-40"
                >
                  Delete Tail (Last)
                </button>
              </>
            )}

            {opTarget && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-300 font-semibold">
                  Delete {opTarget === "head" ? "Head Node" : "Tail Node"}:
                </span>
                <button
                  onClick={opTarget === "head" ? handleRunDeleteHead : handleRunDeleteTail}
                  disabled={isPlaying || currentNodes.length === 0}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
                >
                  <span>🗑</span>
                  <span>Delete {opTarget === "head" ? "Head" : "Tail"} Now</span>
                </button>
              </div>
            )}
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

      {/* ── 4. THE CANVAS (Pointers + Animated Link Directions) ── */}
      <div className="w-full min-h-[260px] p-6 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col items-center justify-center gap-4 overflow-x-auto shadow-inner relative">
        {/* Pending Newly Allocated Node */}
        {activeStep.pendingNode && (
          <div className="flex flex-col items-center mb-1 animate-bounce">
            <span className="text-[10px] font-mono text-purple-400 font-bold mb-0.5">
              Newly Allocated Node in Memory
            </span>
            <div className="flex items-center rounded-xl border-2 border-purple-500 bg-purple-950/80 font-mono text-xs overflow-hidden shadow-lg">
              {isDoubly && (
                <span className="px-2 py-1.5 bg-slate-900 border-r border-slate-800 text-slate-400">
                  prev
                </span>
              )}
              <span className="px-4 py-2 font-bold text-white text-sm">
                {activeStep.pendingNode.data}
              </span>
              <span className="px-2 py-1.5 bg-slate-900 border-l border-slate-800 text-indigo-400">
                next {activeStep.pendingNextTo ? "➔" : "⦸"}
              </span>
            </div>
            {activeStep.pendingNextTo && (
              <span className="text-[10px] text-emerald-400 font-mono mt-0.5 animate-pulse">
                ↓ linking into HEAD ↓
              </span>
            )}
          </div>
        )}

        {/* The Node Chain */}
        {currentNodes.length === 0 ? (
          <div className="text-slate-500 text-xs italic">
            List is empty (HEAD = NULL). Click "+ Insert" to add nodes.
          </div>
        ) : (
          <div className="flex items-center justify-start gap-1 py-4 px-2 min-w-max">
            {currentNodes.map((node, idx) => {
              const isHead = pointers.head === idx;
              const isTail = pointers.tail === idx;
              const isCurr = pointers.curr === idx;
              const isPrev = pointers.prev === idx;
              const isNext = pointers.next === idx;
              const isDeleting = activeStep.deletingIdx === idx;

              // Arrow direction leading OUT of this node
              const arrowDir = arrowDirections[idx] || "forward";
              const isFlipping = activeStep.flippingIdx === idx;
              const isSevered = activeStep.severingEdge === idx;

              return (
                <React.Fragment key={node.id}>
                  <div className="flex flex-col items-center gap-1.5">
                    {/* Live Pointer Badges Floating Above Node */}
                    <div className="h-6 flex items-center justify-center gap-1">
                      {isHead && (
                        <span className="text-[10px] font-mono font-bold text-emerald-300 px-1.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-600 shadow-sm animate-pulse">
                          HEAD ↓
                        </span>
                      )}
                      {isCurr && (
                        <span className="text-[10px] font-mono font-bold text-amber-300 px-1.5 py-0.5 rounded-full bg-amber-950 border border-amber-500 shadow-sm animate-bounce">
                          CURR ↓
                        </span>
                      )}
                      {isPrev && (
                        <span className="text-[10px] font-mono font-bold text-purple-300 px-1.5 py-0.5 rounded-full bg-purple-950 border border-purple-500 shadow-sm">
                          PREV ↓
                        </span>
                      )}
                      {isNext && (
                        <span className="text-[10px] font-mono font-bold text-sky-300 px-1.5 py-0.5 rounded-full bg-sky-950 border border-sky-500 shadow-sm">
                          NEXT ↓
                        </span>
                      )}
                      {isTail && !isHead && (
                        <span className="text-[10px] font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-800">
                          TAIL ↓
                        </span>
                      )}
                    </div>

                    {/* Node Box with Center Dividing Line (Left: Data, Right: Next Pointer) */}
                    <div
                      className={`flex items-stretch rounded-xl border-2 font-mono text-xs overflow-hidden shadow-md transition-all duration-300 ${
                        isDeleting
                          ? "border-rose-500 bg-rose-950/70 text-rose-200 scale-95"
                          : isCurr
                          ? "border-amber-400 bg-amber-950/50 shadow-amber-500/20 scale-105"
                          : isHead
                          ? "border-emerald-500 bg-emerald-950/30"
                          : "border-slate-700 bg-slate-900/80"
                      }`}
                    >
                      {isDoubly && (
                        <>
                          <span className="px-2 py-2 bg-slate-950 text-slate-400 text-[10px] flex items-center justify-center">
                            prev
                          </span>
                          <div className="w-[1.5px] bg-slate-700 self-stretch" />
                        </>
                      )}

                      {/* Left: Value / Data */}
                      <span className="px-4 py-2 font-bold text-white text-base flex items-center justify-center min-w-[36px]">
                        {node.data}
                      </span>

                      {/* Center Divider Line */}
                      <div className="w-[2px] bg-slate-700/90 self-stretch" />

                      {/* Right: Next Pointer */}
                      <span className="px-3 py-2 bg-slate-950 flex items-center justify-center text-indigo-400 text-[11px] font-semibold gap-1">
                        <span>next</span>
                        <span className="text-sky-400">●</span>
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500">[{idx}]</span>
                  </div>

                  {/* Forward, Reversed, or Severed Pointer Arrow */}
                  {idx < currentNodes.length - 1 && (
                    <div className="flex flex-col items-center px-1">
                      {isSevered ? (
                        <span className="text-xs font-mono font-bold text-rose-500 animate-pulse">
                          ✕ (severed)
                        </span>
                      ) : (
                        <span
                          className={`text-lg font-black transition-all duration-300 ${
                            isFlipping
                              ? "text-orange-400 scale-125 animate-pulse"
                              : arrowDir === "backward"
                              ? "text-amber-400"
                              : "text-indigo-400"
                          }`}
                        >
                          {arrowDir === "backward" ? "←" : isDoubly ? "⇄" : "→"}
                        </span>
                      )}
                    </div>
                  )}

                  {/* NULL Terminator at end */}
                  {idx === currentNodes.length - 1 && !isCircular && (
                    <div className="flex items-center gap-1 pl-2">
                      <span className="text-sm font-bold text-slate-500">→</span>
                      <span className="font-mono text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                        NULL
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Circular Return Arc indicator */}
        {isCircular && currentNodes.length > 1 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-indigo-800/40 text-[11px] font-mono text-indigo-400 shadow-sm mt-1">
            <span>↺</span>
            <span>Circular Loop: Tail.next points back to HEAD ({currentNodes[0]?.data})</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default LinkedListVisualizer;
