// src/tools/dsv/topics/sorting/SortingVisualizer.jsx
// Highly visual, beginner-friendly sorting visualizer with exaggerated 2.5D physical crossover swap animation

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DSVStepController } from "../../components/DSVStepController";
import { DSV_COLORS } from "../../types";
import {
  generateBubbleSortSteps,
  generateSelectionSortSteps,
  generateInsertionSortSteps,
  generateMergeSortSteps,
  generateQuickSortSteps,
} from "./sortingEngine";

const DEFAULT_ARRAY_VALUES = [45, 12, 85, 32, 89, 39, 69, 22];

function makeItems(values) {
  return values.map((val, idx) => ({
    id: `item-${val}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    val,
  }));
}

export function SortingVisualizer({ type = "bubble" }) {
  const [items, setItems] = useState(() => makeItems(DEFAULT_ARRAY_VALUES));
  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(550);

  const safeType = type || "bubble";

  useEffect(() => {
    setIsPlaying(false);
    setStepIdx(0);
    const initialItems = makeItems(DEFAULT_ARRAY_VALUES);
    setItems(initialItems);
    setSteps([
      {
        array: [...initialItems],
        highlights: {},
        comparisons: 0,
        swaps: 0,
        swapIndices: null,
        message: `${safeType.toUpperCase()} Sort ready. Click "▶ Sort Array" to watch elements compare and smoothly swap positions!`,
      },
    ]);
  }, [type, safeType]);

  const activeStep = steps[stepIdx] || steps[0] || {};
  const currentArray = activeStep.array || items;

  const handleSort = () => {
    setIsPlaying(false);
    let s = [];
    if (safeType === "selection") {
      s = generateSelectionSortSteps(items);
    } else if (safeType === "insertion") {
      s = generateInsertionSortSteps(items);
    } else if (safeType === "merge") {
      s = generateMergeSortSteps(items);
    } else if (safeType === "quick") {
      s = generateQuickSortSteps(items);
    } else {
      s = generateBubbleSortSteps(items);
    }

    setSteps(s);
    setStepIdx(0);
    setIsPlaying(true);
  };

  const handleShuffle = () => {
    setIsPlaying(false);
    const vals = currentArray.map((it) => (typeof it === "object" ? it.val : it));
    const shuffledVals = [...vals].sort(() => Math.random() - 0.5);
    const newItems = makeItems(shuffledVals);
    setItems(newItems);
    setSteps([
      {
        array: newItems,
        highlights: {},
        comparisons: 0,
        swaps: 0,
        swapIndices: null,
        message: "Array shuffled into random order. Ready to sort!",
      },
    ]);
    setStepIdx(0);
  };

  const handleReset = () => {
    setIsPlaying(false);
    const resetItems = makeItems(DEFAULT_ARRAY_VALUES);
    setItems(resetItems);
    setSteps([
      {
        array: resetItems,
        highlights: {},
        comparisons: 0,
        swaps: 0,
        swapIndices: null,
        message: "Array reset to default values.",
      },
    ]);
    setStepIdx(0);
  };

  // Find max value for bar scaling
  const maxVal = Math.max(
    ...currentArray.map((it) => (typeof it === "object" ? it.val : it)),
    100
  );

  const swapIndices = activeStep.swapIndices || null;
  const isSwapping = Boolean(swapIndices && swapIndices.length === 2);

  return (
    <div className="flex flex-col items-center gap-3.5 w-full max-w-4xl mx-auto select-none">
      {/* ── 1. TOP BEGINNER EXPLANATION BANNER ── */}
      <div className="w-full flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/90 border border-indigo-900/50 text-xs sm:text-sm text-slate-100 shadow-sm transition-all duration-300">
        <span className="text-base leading-none select-none">💡</span>
        <div className="flex-1 leading-relaxed">
          <span className="font-bold text-indigo-400 mr-1.5 uppercase text-[11px] tracking-wider">
            {isSwapping ? "Executing Swap:" : "Step Explanation:"}
          </span>
          <span className="text-slate-200">
            {activeStep.message || "Select an operation below to see step-by-step visual execution."}
          </span>
        </div>
      </div>

      {/* ── 2. PROGRESSIVE OPERATION & CONTROL BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-xl border border-slate-800 bg-slate-900/60 w-full text-xs">
        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSort}
            disabled={isPlaying}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span>▶</span>
            <span>Sort Array</span>
          </button>

          <button
            onClick={handleShuffle}
            disabled={isPlaying}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer disabled:opacity-40"
          >
            🔀 Shuffle
          </button>

          <button
            onClick={handleReset}
            disabled={isPlaying}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer disabled:opacity-40"
          >
            ↺ Reset
          </button>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-slate-400">
            Comparisons: <strong className="text-amber-400">{activeStep.comparisons ?? 0}</strong>
          </span>
          <span className="text-slate-400">
            Swaps: <strong className="text-orange-400">{activeStep.swaps ?? 0}</strong>
          </span>
        </div>
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

      {/* ── 4. THE CANVAS (Exaggerated Crossover Swap Animation) ── */}
      <div className="w-full min-h-[300px] p-6 rounded-2xl border border-slate-800 bg-slate-950/90 flex flex-col items-center justify-end shadow-inner relative overflow-hidden">
        {/* Animated Swap Arc Beacon */}
        <AnimatePresence>
          {isSwapping && (
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.8 }}
              className="absolute top-4 px-4 py-1.5 rounded-full bg-orange-950/90 border-2 border-orange-500 text-orange-200 font-mono text-xs font-black shadow-2xl flex items-center gap-2"
            >
              <span className="animate-spin">⇄</span>
              <span>
                SWAP: [
                {swapIndices[0]}
                ] ⮀ [
                {swapIndices[1]}
                ]
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated Bar Chart */}
        <div className="flex items-end justify-center gap-3 sm:gap-4 w-full h-[220px]">
          {currentArray.map((item, idx) => {
            const val = typeof item === "object" ? item.val : item;
            const itemId = typeof item === "object" ? item.id : `bar-${val}-${idx}`;
            const heightPercent = Math.max(18, Math.round((val / maxVal) * 165));
            const status = activeStep.highlights?.[idx] || "default";

            const isLeftSwapper = isSwapping && swapIndices[0] === idx;
            const isRightSwapper = isSwapping && swapIndices[1] === idx;
            const isComparing = status === "comparing";

            let border = DSV_COLORS.default;
            let bg = "rgba(30, 41, 59, 0.6)";
            let textColor = "#94a3b8";

            // Elevation and vertical crossover offsets for physical swap animation
            let yOffset = 0;
            let zIndex = 1;
            let scale = 1;

            if (isLeftSwapper) {
              border = DSV_COLORS.swapping;
              bg = "rgba(249, 115, 22, 0.75)";
              textColor = "#ffedd5";
              yOffset = -28; // Lifts up to cross over
              zIndex = 10;
              scale = 1.1;
            } else if (isRightSwapper) {
              border = DSV_COLORS.swapping;
              bg = "rgba(249, 115, 22, 0.75)";
              textColor = "#ffedd5";
              yOffset = 12; // Dips down to cross under
              zIndex = 9;
              scale = 1.05;
            } else if (isComparing) {
              border = DSV_COLORS.comparing;
              bg = "rgba(245, 158, 11, 0.5)";
              textColor = "#fbbf24";
              yOffset = -8;
              scale = 1.05;
            } else if (status === "found") {
              border = DSV_COLORS.found;
              bg = "rgba(16, 185, 129, 0.4)";
              textColor = "#34d399";
            } else if (status === "active") {
              border = DSV_COLORS.active;
              bg = "rgba(56, 189, 248, 0.4)";
              textColor = "#38bdf8";
            }

            return (
              <motion.div
                key={itemId}
                layout
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 22,
                  duration: speed ? speed / 1000 : 0.5,
                }}
                className="flex flex-col items-center gap-1.5 w-10 sm:w-12 select-none relative"
                style={{ zIndex }}
                animate={{
                  y: yOffset,
                  scale,
                }}
              >
                {/* Value Label */}
                <span
                  className="text-xs font-mono font-bold transition-colors"
                  style={{ color: textColor }}
                >
                  {val}
                </span>

                {/* Vertical Bar */}
                <div
                  className="w-full rounded-t-lg border-t-2 border-x-2 shadow-md transition-all duration-200"
                  style={{
                    height: `${heightPercent}px`,
                    borderColor: border,
                    backgroundColor: bg,
                    boxShadow: isLeftSwapper || isRightSwapper ? "0 0 20px rgba(249,115,22,0.8)" : "none",
                  }}
                />

                {/* Index Label */}
                <span className="text-[10px] font-mono text-slate-500">[{idx}]</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SortingVisualizer;
