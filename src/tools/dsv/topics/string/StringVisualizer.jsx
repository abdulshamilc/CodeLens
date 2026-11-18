// src/tools/dsv/topics/string/StringVisualizer.jsx
// Progressive, beginner-friendly String visualizer with top explanation and step-by-step disclosure

import React, { useState, useEffect } from "react";
import { DSVStepController } from "../../components/DSVStepController";
import { DSV_COLORS } from "../../types";
import {
  generateCharArraySteps,
  generatePalindromeSteps,
  generateFrequencySteps,
  generatePatternSearchSteps,
} from "./stringEngine";

export function StringVisualizer({ type = "char-array" }) {
  const safeType = type || "char-array";
  const [textInput, setTextInput] = useState("racecar");
  const [idxInput, setIdxInput] = useState(2);
  const [patternInput, setPatternInput] = useState("car");

  const [opCategory, setOpCategory] = useState(null);

  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);

  useEffect(() => {
    setIsPlaying(false);
    setStepIdx(0);
    setOpCategory(null);

    if (safeType === "palindrome") {
      setTextInput("racecar");
      setSteps(generatePalindromeSteps("racecar"));
    } else if (safeType === "frequency") {
      setTextInput("banana");
      setSteps(generateFrequencySteps("banana"));
    } else if (safeType === "pattern-search") {
      setTextInput("abracadabra");
      setPatternInput("cad");
      setSteps(generatePatternSearchSteps("abracadabra", "cad"));
    } else {
      setTextInput("hello");
      setSteps(generateCharArraySteps("hello", 2));
    }
  }, [type, safeType]);

  const activeStep = steps[stepIdx] || steps[0] || {};

  const handleRun = () => {
    setIsPlaying(false);
    let s = [];
    if (type === "palindrome") {
      s = generatePalindromeSteps(textInput);
    } else if (type === "frequency") {
      s = generateFrequencySteps(textInput);
    } else if (type === "pattern-search") {
      s = generatePatternSearchSteps(textInput, patternInput);
    } else {
      s = generateCharArraySteps(textInput, idxInput);
    }
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
              onClick={handleRun}
              disabled={isPlaying}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>▶</span>
              <span>
                Run {type === "palindrome" ? "Palindrome Check" : type === "frequency" ? "Frequency Count" : type === "pattern-search" ? "Pattern Search" : "Character Access"}
              </span>
            </button>

            <button
              onClick={() => setOpCategory("edit")}
              disabled={isPlaying}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ✏ Edit Inputs
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

        {opCategory === "edit" && (
          <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
            <button
              onClick={() => setOpCategory(null)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              ← Back
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Text:</span>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={isPlaying}
                className="w-24 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
              />
            </div>

            {type === "char-array" && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Index:</span>
                <input
                  type="number"
                  value={idxInput}
                  onChange={(e) => setIdxInput(Number(e.target.value))}
                  disabled={isPlaying}
                  className="w-14 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {type === "pattern-search" && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Pattern:</span>
                <input
                  type="text"
                  value={patternInput}
                  onChange={(e) => setPatternInput(e.target.value)}
                  disabled={isPlaying}
                  className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <button
              onClick={() => {
                setOpCategory(null);
                handleRun();
              }}
              disabled={isPlaying || !textInput.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <span>▶</span>
              <span>Run</span>
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
        {/* Character Array */}
        <div className="flex items-center justify-center gap-2 py-2">
          {(activeStep.chars || []).map((ch, idx) => {
            const status = activeStep.highlights?.[idx] || "default";
            let border = DSV_COLORS.default;
            let bg = "rgba(15, 23, 42, 0.7)";
            let textColor = "text-slate-100";

            if (status === "active") {
              border = DSV_COLORS.active;
              bg = "rgba(56, 189, 248, 0.25)";
              textColor = "text-sky-300";
            } else if (status === "found") {
              border = DSV_COLORS.found;
              bg = "rgba(16, 185, 129, 0.25)";
              textColor = "text-emerald-300";
            } else if (status === "deleted") {
              border = DSV_COLORS.deleted;
              bg = "rgba(239, 68, 68, 0.25)";
              textColor = "text-rose-300";
            }

            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div
                  className="w-11 h-11 rounded-xl border-2 flex items-center justify-center font-mono font-bold text-sm shadow-sm transition-all duration-300"
                  style={{ borderColor: border, backgroundColor: bg }}
                >
                  <span className={textColor}>{ch}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">[{idx}]</span>
              </div>
            );
          })}
        </div>

        {/* Frequency Table */}
        {type === "frequency" && activeStep.freq && (
          <div className="flex items-center gap-2 flex-wrap border-t border-slate-800/80 pt-3">
            {Object.entries(activeStep.freq).map(([k, count]) => (
              <div
                key={k}
                className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 font-mono text-xs flex items-center gap-1.5"
              >
                <strong className="text-white">'{k}'</strong>
                <span className="text-slate-500">→</span>
                <span className="text-amber-400 font-bold">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StringVisualizer;
