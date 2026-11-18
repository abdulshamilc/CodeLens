// src/tools/dsv/topics/trie/TrieVisualizer.jsx
// Progressive, beginner-friendly Trie visualizer with top explanation and step-by-step disclosure

import React, { useState, useEffect, useMemo } from "react";
import { DSVStepController } from "../../components/DSVStepController";
import { DSV_COLORS } from "../../types";
import {
  createInitialTrie,
  generateTrieInsertSteps,
  generateTrieSearchSteps,
  getAllWords,
  layoutTrie,
} from "./trieEngine";

export function TrieVisualizer() {
  const [trieRoot, setTrieRoot] = useState(() => createInitialTrie(["cat", "car", "dog"]));
  const [wordInput, setWordInput] = useState("cart");

  const [opCategory, setOpCategory] = useState(null); // "insert" | "search-exact" | "search-prefix"

  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);

  useEffect(() => {
    setIsPlaying(false);
    setStepIdx(0);
    setOpCategory(null);
    const initial = createInitialTrie(["cat", "car", "dog"]);
    setTrieRoot(initial);
    setSteps([
      {
        root: initial,
        activeNodeId: null,
        message: "Trie (Prefix Tree) ready. Green badges indicate valid completed words.",
        highlightedNodes: [],
      },
    ]);
  }, []);

  const activeStep = steps[stepIdx] || steps[0] || {};
  const currentRoot = activeStep.root || trieRoot;

  const allWords = useMemo(() => getAllWords(currentRoot), [currentRoot]);
  const { nodes, edges } = useMemo(() => layoutTrie(currentRoot, 640), [currentRoot]);

  const handleRunInsert = () => {
    const word = wordInput.trim().toLowerCase();
    if (!word) return;
    setIsPlaying(false);
    const { steps: s, updatedRoot } = generateTrieInsertSteps(trieRoot, word);
    setSteps(s);
    setStepIdx(0);
    setIsPlaying(true);
    setTrieRoot(updatedRoot);
  };

  const handleRunSearch = (isPrefix = false) => {
    const word = wordInput.trim().toLowerCase();
    if (!word) return;
    setIsPlaying(false);
    const s = generateTrieSearchSteps(trieRoot, word, isPrefix);
    setSteps(s);
    setStepIdx(0);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setOpCategory(null);
    const initial = createInitialTrie(["cat", "car", "dog"]);
    setTrieRoot(initial);
    setSteps([
      {
        root: initial,
        activeNodeId: null,
        message: "Trie reset to default words: cat, car, dog.",
        highlightedNodes: [],
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
              <span>Insert Word</span>
            </button>

            <button
              onClick={() => setOpCategory("search-exact")}
              disabled={isPlaying}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer disabled:opacity-40"
            >
              🔍 Exact Word Search
            </button>

            <button
              onClick={() => setOpCategory("search-prefix")}
              disabled={isPlaying}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition cursor-pointer disabled:opacity-40"
            >
              🔤 StartsWith Prefix Search
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
            <span className="text-slate-300 font-semibold">Insert Word:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Word:</span>
              <input
                type="text"
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
                disabled={isPlaying}
                className="w-24 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleRunInsert}
              disabled={isPlaying || !wordInput.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>▶</span>
              <span>Insert Word</span>
            </button>
          </div>
        )}

        {/* Exact Search Sub-menu */}
        {opCategory === "search-exact" && (
          <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
            <button
              onClick={() => setOpCategory(null)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ← Back
            </button>
            <span className="text-slate-300 font-semibold">Search Exact Word:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Word:</span>
              <input
                type="text"
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
                disabled={isPlaying}
                className="w-24 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => handleRunSearch(false)}
              disabled={isPlaying || !wordInput.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>🔍</span>
              <span>Check Exact Word</span>
            </button>
          </div>
        )}

        {/* Prefix Search Sub-menu */}
        {opCategory === "search-prefix" && (
          <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
            <button
              onClick={() => setOpCategory(null)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ← Back
            </button>
            <span className="text-slate-300 font-semibold">Prefix Match:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Prefix:</span>
              <input
                type="text"
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
                disabled={isPlaying}
                className="w-24 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => handleRunSearch(true)}
              disabled={isPlaying || !wordInput.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>🔤</span>
              <span>Check Prefix</span>
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
        {/* Words In Trie Badge List */}
        <div className="w-full flex items-center gap-2 flex-wrap text-xs font-mono text-slate-400">
          <span className="text-slate-500">Stored Words:</span>
          {allWords.map((w, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300 font-bold"
            >
              {w}
            </span>
          ))}
        </div>

        {/* Tree SVG */}
        <div className="w-full flex justify-center">
          <svg className="w-full max-w-[640px] h-[220px]" viewBox="0 0 640 220">
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
            {nodes.map((node) => {
              const isActive = activeStep.activeNodeId === node.id;
              const isWord = node.isWord;

              let fill = "#0f172a";
              let stroke = isWord ? "#10b981" : "#3b82f6";
              if (isActive) {
                fill = "rgba(245, 158, 11, 0.4)";
                stroke = "#f59e0b";
              }

              return (
                <g key={node.id} className="transition-all duration-300">
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={16}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isActive ? 3 : 2}
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fill={isActive ? "#fbbf24" : isWord ? "#34d399" : "#ffffff"}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {node.char || "•"}
                  </text>
                  {isWord && (
                    <circle
                      cx={node.x + 10}
                      cy={node.y - 10}
                      r={3}
                      fill="#10b981"
                      stroke="#0f172a"
                      strokeWidth={1}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

export default TrieVisualizer;
