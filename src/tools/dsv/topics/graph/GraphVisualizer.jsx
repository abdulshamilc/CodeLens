// src/tools/dsv/topics/graph/GraphVisualizer.jsx
// Highly animated Graph visualizer with glowing edge paths, traveling orb, and live queue/stack

import React, { useState, useEffect, useMemo } from "react";
import { DSVStepController } from "../../components/DSVStepController";
import {
  DEFAULT_GRAPH_NODES,
  DEFAULT_GRAPH_EDGES,
  generateBFSSteps,
  generateDFSSteps,
} from "./graphEngine";

export function GraphVisualizer({ type = "undirected" }) {
  const safeType = type || "undirected";
  const isDirected = safeType === "directed";
  const showWeights = safeType === "weighted";

  const [startNode, setStartNode] = useState("A");
  const [opCategory, setOpCategory] = useState(null);

  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);

  useEffect(() => {
    setIsPlaying(false);
    setStepIdx(0);
    setOpCategory(null);
    const s = generateBFSSteps(DEFAULT_GRAPH_NODES, DEFAULT_GRAPH_EDGES, "A", isDirected);
    setSteps(s);
  }, [type, isDirected]);

  const activeStep = steps[stepIdx] || steps[0] || {};

  const handleRunBFS = () => {
    setIsPlaying(false);
    const s = generateBFSSteps(DEFAULT_GRAPH_NODES, DEFAULT_GRAPH_EDGES, startNode, isDirected);
    setSteps(s);
    setStepIdx(0);
    setIsPlaying(true);
  };

  const handleRunDFS = () => {
    setIsPlaying(false);
    const s = generateDFSSteps(DEFAULT_GRAPH_NODES, DEFAULT_GRAPH_EDGES, startNode, isDirected);
    setSteps(s);
    setStepIdx(0);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setOpCategory(null);
    setStepIdx(0);
  };

  // Find active node coordinates for traveling orb
  const activeNodeCoord = useMemo(
    () => DEFAULT_GRAPH_NODES.find((n) => n.id === activeStep.activeNode) || null,
    [activeStep.activeNode]
  );

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
            {activeStep.message || "Select an algorithm below to trace traversal."}
          </span>
        </div>
      </div>

      {/* ── 2. PROGRESSIVE OPERATION BAR ── */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-slate-800 bg-slate-900/60 w-full text-xs">
        {opCategory === null && (
          <div className="flex items-center gap-2 flex-wrap w-full">
            <span className="text-slate-400 font-medium mr-1">Choose Traversal:</span>
            <button
              onClick={() => setOpCategory("bfs")}
              disabled={isPlaying}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>▶</span>
              <span>Breadth-First Search (BFS)</span>
            </button>

            <button
              onClick={() => setOpCategory("dfs")}
              disabled={isPlaying}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>▶</span>
              <span>Depth-First Search (DFS)</span>
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

        {opCategory === "bfs" && (
          <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
            <button
              onClick={() => setOpCategory(null)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ← Back
            </button>
            <span className="text-slate-300 font-semibold">Run BFS Traversal:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Start Node:</span>
              <select
                value={startNode}
                onChange={(e) => setStartNode(e.target.value)}
                disabled={isPlaying}
                className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
              >
                {DEFAULT_GRAPH_NODES.map((n) => (
                  <option key={n.id} value={n.id}>
                    Node {n.id}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleRunBFS}
              disabled={isPlaying}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <span>▶</span>
              <span>Start BFS</span>
            </button>
          </div>
        )}

        {opCategory === "dfs" && (
          <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
            <button
              onClick={() => setOpCategory(null)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ← Back
            </button>
            <span className="text-slate-300 font-semibold">Run DFS Traversal:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Start Node:</span>
              <select
                value={startNode}
                onChange={(e) => setStartNode(e.target.value)}
                disabled={isPlaying}
                className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
              >
                {DEFAULT_GRAPH_NODES.map((n) => (
                  <option key={n.id} value={n.id}>
                    Node {n.id}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleRunDFS}
              disabled={isPlaying}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <span>▶</span>
              <span>Start DFS</span>
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
      <div className="w-full min-h-[300px] p-4 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col items-center justify-between gap-3 shadow-inner relative overflow-hidden">
        {/* Graph SVG */}
        <div className="w-full flex justify-center">
          <svg className="w-full max-w-[560px] h-[210px]" viewBox="0 0 560 210">
            {/* Arrow Marker for Directed Graphs */}
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
              </marker>
            </defs>

            {/* Edges with Active Path Highlighting */}
            {DEFAULT_GRAPH_EDGES.map((edge, eIdx) => {
              const u = DEFAULT_GRAPH_NODES.find((n) => n.id === edge.from);
              const v = DEFAULT_GRAPH_NODES.find((n) => n.id === edge.to);
              if (!u || !v) return null;

              const isEdgeActive =
                activeStep.currentEdge &&
                ((activeStep.currentEdge.from === edge.from && activeStep.currentEdge.to === edge.to) ||
                  (!isDirected &&
                    activeStep.currentEdge.from === edge.to &&
                    activeStep.currentEdge.to === edge.from));

              return (
                <g key={eIdx}>
                  <line
                    x1={u.x}
                    y1={u.y}
                    x2={v.x}
                    y2={v.y}
                    stroke={isEdgeActive ? "#38bdf8" : "#334155"}
                    strokeWidth={isEdgeActive ? 3.5 : 1.5}
                    markerEnd={isDirected ? "url(#arrow)" : undefined}
                    className="transition-colors duration-300"
                  />
                  {showWeights && (
                    <text
                      x={(u.x + v.x) / 2}
                      y={(u.y + v.y) / 2 - 5}
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {edge.weight}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Traveling Orb over Active Node */}
            {activeNodeCoord && (
              <circle
                cx={activeNodeCoord.x}
                cy={activeNodeCoord.y}
                r={24}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="4 2"
                className="animate-spin"
              />
            )}

            {/* Nodes */}
            {DEFAULT_GRAPH_NODES.map((node) => {
              const isVisited = (activeStep.visited || []).includes(node.id);
              const isActive = activeStep.activeNode === node.id;
              const visitOrderIdx = (activeStep.visited || []).indexOf(node.id);

              let fill = "#0f172a";
              let stroke = "#475569";
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
                    fontSize="12"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {node.id}
                  </text>
                  {/* Visit Order Index */}
                  {visitOrderIdx !== -1 && (
                    <text
                      x={node.x + 15}
                      y={node.y - 12}
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

        {/* Live Structure (Queue for BFS / Stack for DFS) */}
        <div className="w-full flex items-center justify-between border-t border-slate-800/80 pt-2 px-2 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold">
              {activeStep.queue ? "BFS Queue (FIFO):" : "DFS Stack (LIFO):"}
            </span>
            <div className="flex items-center gap-1">
              {(activeStep.queue || activeStep.stack || []).map((id, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-sky-300 font-bold"
                >
                  {id}
                </span>
              ))}
              {(activeStep.queue || activeStep.stack || []).length === 0 && (
                <span className="text-slate-600 italic">empty</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold">Visited:</span>
            <span className="text-emerald-400 font-bold">
              [{(activeStep.visited || []).join(", ")}]
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GraphVisualizer;
