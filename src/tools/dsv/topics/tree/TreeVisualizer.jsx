// src/tools/dsv/topics/tree/TreeVisualizer.jsx
// Highly animated Binary Tree visualizer with glowing edge paths, traveling orb, and step-by-step traversal order

import React, { useState, useEffect, useMemo } from "react";
import { DSVStepController } from "../../components/DSVStepController";
import {
  getTreePreset,
  layoutBinaryTree,
  generateInorderSteps,
  generatePreorderSteps,
  generatePostorderSteps,
  generateLevelOrderSteps,
} from "./treeEngine";

export function TreeVisualizer({ type = "balanced" }) {
  const safeType = type || "balanced";
  const [treeRoot, setTreeRoot] = useState(() => getTreePreset(safeType));
  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);

  useEffect(() => {
    setIsPlaying(false);
    setStepIdx(0);
    const newRoot = getTreePreset(safeType);
    setTreeRoot(newRoot);
    setSteps([
      {
        activeId: null,
        activeEdgeId: null,
        visited: [],
        visitedIds: [],
        message: `${safeType.toUpperCase()} Binary Tree loaded. Select a traversal operation below to watch the path!`,
      },
    ]);
  }, [type, safeType]);

  const activeStep = steps[stepIdx] || steps[0] || {};
  const { nodes, edges } = useMemo(() => layoutBinaryTree(treeRoot, 580), [treeRoot]);

  // Find active node coordinates for traveling orb
  const activeNodeCoord = useMemo(
    () => nodes.find((n) => n.id === activeStep.activeId) || null,
    [nodes, activeStep.activeId]
  );

  const runTraversal = (genFn) => {
    setIsPlaying(false);
    const s = genFn(treeRoot);
    setSteps(s);
    setStepIdx(0);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setSteps([
      {
        activeId: null,
        activeEdgeId: null,
        visited: [],
        visitedIds: [],
        message: "Tree reset. Choose a traversal to begin.",
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
            Traversal Step:
          </span>
          <span className="text-slate-200">
            {activeStep.message || "Select an operation below to see step-by-step visual execution."}
          </span>
        </div>
      </div>

      {/* ── 2. PROGRESSIVE OPERATION BAR ── */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-slate-800 bg-slate-900/60 w-full text-xs">
        <span className="text-slate-400 font-medium mr-1">Choose Traversal:</span>
        <button
          onClick={() => runTraversal(generateInorderSteps)}
          disabled={isPlaying}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer"
        >
          Inorder (L-Root-R)
        </button>

        <button
          onClick={() => runTraversal(generatePreorderSteps)}
          disabled={isPlaying}
          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition cursor-pointer"
        >
          Preorder (Root-L-R)
        </button>

        <button
          onClick={() => runTraversal(generatePostorderSteps)}
          disabled={isPlaying}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition cursor-pointer"
        >
          Postorder (L-R-Root)
        </button>

        <button
          onClick={() => runTraversal(generateLevelOrderSteps)}
          disabled={isPlaying}
          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition cursor-pointer"
        >
          Level-Order (BFS)
        </button>

        <button
          onClick={handleReset}
          disabled={isPlaying}
          className="ml-auto px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer disabled:opacity-40"
        >
          ↺ Reset
        </button>
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

      {/* ── 4. THE CANVAS (Dynamic Tree SVG with Traveling Orb & Glowing Edges) ── */}
      <div className="w-full min-h-[300px] p-4 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col items-center justify-between gap-3 shadow-inner relative overflow-hidden">
        <div className="w-full flex justify-center">
          <svg className="w-full max-w-[580px] h-[220px]" viewBox="0 0 580 220">
            {/* Edges with Active Path Highlighting */}
            {edges.map((e) => {
              const isEdgeActive = activeStep.activeEdgeId === e.id;
              return (
                <line
                  key={e.id}
                  x1={e.x1}
                  y1={e.y1}
                  x2={e.x2}
                  y2={e.y2}
                  stroke={isEdgeActive ? "#38bdf8" : "#334155"}
                  strokeWidth={isEdgeActive ? 3.5 : 2}
                  className="transition-colors duration-300"
                />
              );
            })}

            {/* Traveling Orb */}
            {activeNodeCoord && (
              <circle
                cx={activeNodeCoord.x}
                cy={activeNodeCoord.y}
                r={23}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeDasharray="4 2"
                className="animate-spin"
              />
            )}

            {/* Nodes */}
            {nodes.map((node) => {
              const isActive = activeStep.activeId === node.id;
              const isVisited = (activeStep.visitedIds || []).includes(node.id);
              const visitOrderIdx = (activeStep.visitedIds || []).indexOf(node.id);

              let fill = "#0f172a";
              let stroke = "#3b82f6";
              if (isActive) {
                fill = "rgba(245, 158, 11, 0.4)";
                stroke = "#f59e0b";
              } else if (isVisited) {
                fill = "rgba(16, 185, 129, 0.4)";
                stroke = "#10b981";
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
                    fill={isActive ? "#fbbf24" : isVisited ? "#34d399" : "#e2e8f0"}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {node.val}
                  </text>
                  {/* Visit Order Badge */}
                  {visitOrderIdx !== -1 && (
                    <text
                      x={node.x + 16}
                      y={node.y - 14}
                      fill="#10b981"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      #{visitOrderIdx + 1}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Visited traversal output */}
        <div className="w-full flex items-center justify-center gap-2 border-t border-slate-800/80 pt-2 font-mono text-xs">
          <span className="text-slate-500 font-bold">Traversal Order:</span>
          <span className="text-emerald-400 font-bold">
            [{(activeStep.visited || []).join(", ")}]
          </span>
        </div>
      </div>
    </div>
  );
}

export default TreeVisualizer;
