// src/tools/dsv/topics/bst/BSTVisualizer.jsx
// Progressive, beginner-friendly BST visualizer with top explanation and step-by-step disclosure

import React, { useState, useEffect, useMemo } from "react";
import { DSVStepController } from "../../components/DSVStepController";
import { DSV_COLORS } from "../../types";
import {
  createInitialBST,
  layoutBST,
  generateBSTSearchSteps,
  generateBSTInsertSteps,
  generateBSTDeleteSteps,
} from "./bstEngine";

export function BSTVisualizer() {
  const [bstRoot, setBstRoot] = useState(() => createInitialBST());
  const [valInput, setValInput] = useState(35);

  const [opCategory, setOpCategory] = useState(null); // "insert" | "delete" | "search"

  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);

  useEffect(() => {
    setIsPlaying(false);
    setStepIdx(0);
    setOpCategory(null);
    const initial = createInitialBST();
    setBstRoot(initial);
    setSteps([
      {
        root: initial,
        activeId: null,
        found: false,
        message: "Binary Search Tree ready. Rule: Left child < Node < Right child.",
      },
    ]);
  }, []);

  const activeStep = steps[stepIdx] || steps[0] || {};
  const currentTree = activeStep.root || bstRoot;
  const { nodes, edges } = useMemo(() => layoutBST(currentTree, 580), [currentTree]);

  const handleRunSearch = () => {
    setIsPlaying(false);
    const s = generateBSTSearchSteps(bstRoot, valInput);
    setSteps(s);
    setStepIdx(0);
    setIsPlaying(true);
  };

  const handleRunInsert = () => {
    setIsPlaying(false);
    const { steps: s, updatedRoot } = generateBSTInsertSteps(bstRoot, valInput);
    setSteps(s);
    setStepIdx(0);
    setIsPlaying(true);
    setBstRoot(updatedRoot);
  };

  const handleRunDelete = () => {
    setIsPlaying(false);
    const { steps: s, updatedRoot } = generateBSTDeleteSteps(bstRoot, valInput);
    setSteps(s);
    setStepIdx(0);
    setIsPlaying(true);
    setBstRoot(updatedRoot);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setOpCategory(null);
    const initial = createInitialBST();
    setBstRoot(initial);
    setSteps([
      {
        root: initial,
        activeId: null,
        found: false,
        message: "BST reset to default 7 nodes.",
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
              <span>Insert Node</span>
            </button>

            <button
              onClick={() => setOpCategory("delete")}
              disabled={isPlaying}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>-</span>
              <span>Delete Node (3 Cases)</span>
            </button>

            <button
              onClick={() => setOpCategory("search")}
              disabled={isPlaying}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer disabled:opacity-40"
            >
              🔍 Search Node
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
            <span className="text-slate-300 font-semibold">Insert into BST:</span>
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
              <span>Insert Node</span>
            </button>
          </div>
        )}

        {/* Delete Sub-menu */}
        {opCategory === "delete" && (
          <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
            <button
              onClick={() => setOpCategory(null)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ← Back
            </button>
            <span className="text-slate-300 font-semibold">Delete from BST:</span>
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
              onClick={handleRunDelete}
              disabled={isPlaying}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>🗑</span>
              <span>Delete Node</span>
            </button>
          </div>
        )}

        {/* Search Sub-menu */}
        {opCategory === "search" && (
          <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
            <button
              onClick={() => setOpCategory(null)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ← Back
            </button>
            <span className="text-slate-300 font-semibold">Search Value in O(log n):</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Target:</span>
              <input
                type="number"
                value={valInput}
                onChange={(e) => setValInput(e.target.value)}
                disabled={isPlaying}
                className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleRunSearch}
              disabled={isPlaying}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>🔍</span>
              <span>Search BST</span>
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

      {/* ── 4. THE CANVAS (Dynamic Tree SVG) ── */}
      <div className="w-full min-h-[300px] p-4 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
        {nodes.length === 0 ? (
          <span className="text-slate-500 text-xs italic">Tree is empty. Insert a root node.</span>
        ) : (
          <svg className="w-full h-[280px]" viewBox="0 0 600 280">
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
                strokeDasharray="4 2"
              />
            ))}

            {/* Nodes */}
            {nodes.map((node) => {
              const isActive = activeStep.activeId === node.id;
              const isFound = isActive && activeStep.found;

              let fill = "#0f172a";
              let stroke = "#3b82f6";
              if (isActive) {
                fill = isFound ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)";
                stroke = isFound ? "#10b981" : "#f59e0b";
              }

              return (
                <g key={node.id} className="transition-all duration-300">
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={18}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isActive ? 3 : 2}
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fill={isActive ? "#ffffff" : "#93c5fd"}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {node.val}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

export default BSTVisualizer;
