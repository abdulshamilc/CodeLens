// src/tools/dsv/topics/array/ArrayVisualizer.jsx
// Progressive, beginner-friendly Array visualizer with top explanation and step-by-step disclosure

import React, { useState, useEffect } from "react";
import { DSVStepController } from "../../components/DSVStepController";
import { DSV_COLORS } from "../../types";
import {
  generateAccessSteps,
  generateInsertSteps,
  generateDeleteSteps,
  generateLinearSearchSteps,
  generateBinarySearchSteps,
  generate2DGridSteps,
  generateDynamicArrayPushSteps,
} from "./arrayEngine";

const INITIAL_1D = [14, 28, 42, 56, 70, 84];
const INITIAL_2D = [
  [10, 20, 30],
  [40, 50, 60],
  [70, 80, 90],
];
const INITIAL_DYN = [10, 20, 30, 40];

export function ArrayVisualizer({ type = "1d" }) {
  const [arr1D, setArr1D] = useState(INITIAL_1D);
  const [grid2D] = useState(INITIAL_2D);
  const [dynArr, setDynArr] = useState(INITIAL_DYN);
  const [dynCap, setDynCap] = useState(4);

  // Progressive Disclosure Menu States
  const [opCategory, setOpCategory] = useState(null); // "insert" | "delete" | "search" | "access"
  const [opSubtype, setOpSubtype] = useState(null);

  // Inputs
  const [valInput, setValInput] = useState(99);
  const [idxInput, setIdxInput] = useState(2);
  const [rowInput, setRowInput] = useState(1);
  const [colInput, setColInput] = useState(2);

  // Steps & Playback
  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);

  const safeType = type || "1d";

  useEffect(() => {
    setIsPlaying(false);
    setStepIdx(0);
    setOpCategory(null);
    setOpSubtype(null);

    if (safeType === "1d") {
      setSteps([
        {
          array: [...arr1D],
          highlights: {},
          pointers: {},
          message: "1D Array ready. Choose an operation below (Insert, Delete, Search, or Access).",
        },
      ]);
    } else if (safeType === "2d") {
      setSteps([
        {
          grid: grid2D.map((r) => [...r]),
          activeCell: null,
          message: "3×3 2D Grid ready. Choose row and column to calculate memory address.",
        },
      ]);
    } else {
      setSteps([
        {
          array: [...dynArr],
          capacity: dynCap,
          highlights: {},
          message: `Dynamic array: Size ${dynArr.length} / Capacity ${dynCap}. When full, capacity doubles!`,
        },
      ]);
    }
  }, [type, safeType]);

  const activeStep = steps[stepIdx] || steps[0] || {};

  const commitIfFinished = (newSteps) => {
    setSteps(newSteps);
    setStepIdx(0);
    setIsPlaying(true);
    const last = newSteps[newSteps.length - 1];
    if (type === "1d" && last?.array) {
      setArr1D(last.array.filter((x) => x !== null));
    } else if (type === "dynamic" && last?.array) {
      setDynArr(last.array);
      if (last.capacity) setDynCap(last.capacity);
    }
  };

  // Execution Handlers
  const handleRunAccess = (indexToAccess) => {
    const s = generateAccessSteps(arr1D, indexToAccess);
    commitIfFinished(s);
  };

  const handleRunInsert = (indexToInsert) => {
    const s = generateInsertSteps(arr1D, indexToInsert, valInput);
    commitIfFinished(s);
  };

  const handleRunDelete = (indexToDelete) => {
    const s = generateDeleteSteps(arr1D, indexToDelete);
    commitIfFinished(s);
  };

  const handleRunSearch = (searchType) => {
    if (searchType === "binary") {
      const sorted = [...arr1D].sort((a, b) => a - b);
      const s = generateBinarySearchSteps(sorted, valInput);
      commitIfFinished(s);
    } else {
      const s = generateLinearSearchSteps(arr1D, valInput);
      commitIfFinished(s);
    }
  };

  const handle2DAccess = () => {
    const s = generate2DGridSteps(grid2D, rowInput, colInput);
    commitIfFinished(s);
  };

  const handleDynPush = () => {
    const s = generateDynamicArrayPushSteps(dynArr, dynCap, valInput);
    commitIfFinished(s);
  };

  const handleDynPop = () => {
    if (dynArr.length === 0) return;
    const popped = [...dynArr];
    popped.pop();
    setDynArr(popped);
    setSteps([
      {
        array: popped,
        capacity: dynCap,
        highlights: {},
        message: `Popped last element. Size is now ${popped.length} / Capacity ${dynCap}.`,
      },
    ]);
    setStepIdx(0);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setOpCategory(null);
    setOpSubtype(null);
    if (type === "1d") {
      setArr1D(INITIAL_1D);
      setSteps([
        {
          array: [...INITIAL_1D],
          highlights: {},
          pointers: {},
          message: "1D Array reset to initial values.",
        },
      ]);
    } else if (type === "2d") {
      setSteps([
        {
          grid: grid2D.map((r) => [...r]),
          activeCell: null,
          message: "2D Grid reset.",
        },
      ]);
    } else {
      setDynArr(INITIAL_DYN);
      setDynCap(4);
      setSteps([
        {
          array: [...INITIAL_DYN],
          capacity: 4,
          highlights: {},
          message: "Dynamic Array reset to size 4, capacity 4.",
        },
      ]);
    }
    setStepIdx(0);
  };

  const currentArray = activeStep.array || (type === "1d" ? arr1D : dynArr);

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
        {/* ── 1D ARRAY OPERATIONS ── */}
        {type === "1d" && (
          <>
            {/* LEVEL 1: Main Category Selection */}
            {opCategory === null && (
              <div className="flex items-center gap-2 flex-wrap w-full">
                <span className="text-slate-400 font-medium mr-1">Choose Operation:</span>
                <button
                  onClick={() => {
                    setOpCategory("insert");
                    setOpSubtype(null);
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
                    setOpSubtype(null);
                  }}
                  disabled={isPlaying || currentArray.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
                >
                  <span>-</span>
                  <span>Delete</span>
                </button>

                <button
                  onClick={() => {
                    setOpCategory("search");
                    setOpSubtype(null);
                  }}
                  disabled={isPlaying}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer disabled:opacity-40"
                >
                  🔍 Search
                </button>

                <button
                  onClick={() => {
                    setOpCategory("access");
                    setOpSubtype("access");
                  }}
                  disabled={isPlaying}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition cursor-pointer disabled:opacity-40"
                >
                  ⚡ Access O(1)
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

            {/* LEVEL 2 & 3: INSERT SUB-MENU */}
            {opCategory === "insert" && (
              <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
                <button
                  onClick={() => {
                    if (opSubtype) setOpSubtype(null);
                    else setOpCategory(null);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
                >
                  ← Back
                </button>

                {!opSubtype && (
                  <>
                    <span className="text-slate-300 font-medium">Where to insert?</span>
                    <button
                      onClick={() => setOpSubtype("start")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition cursor-pointer"
                    >
                      At Beginning (Index 0)
                    </button>
                    <button
                      onClick={() => setOpSubtype("end")}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition cursor-pointer"
                    >
                      At End (Append)
                    </button>
                    <button
                      onClick={() => setOpSubtype("index")}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer"
                    >
                      At Specific Index
                    </button>
                  </>
                )}

                {opSubtype && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-300 font-semibold">
                      Insert {opSubtype === "start" ? "at Start" : opSubtype === "end" ? "at End" : `at Index [${idxInput}]`}:
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

                    {opSubtype === "index" && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Index:</span>
                        <input
                          type="number"
                          value={idxInput}
                          min={0}
                          max={currentArray.length}
                          onChange={(e) => setIdxInput(e.target.value)}
                          disabled={isPlaying}
                          className="w-14 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}

                    <button
                      onClick={() => {
                        const targetIdx = opSubtype === "start" ? 0 : opSubtype === "end" ? currentArray.length : idxInput;
                        handleRunInsert(targetIdx);
                      }}
                      disabled={isPlaying}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
                    >
                      <span>▶</span>
                      <span>Insert Element</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* LEVEL 2 & 3: DELETE SUB-MENU */}
            {opCategory === "delete" && (
              <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
                <button
                  onClick={() => {
                    if (opSubtype) setOpSubtype(null);
                    else setOpCategory(null);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
                >
                  ← Back
                </button>

                {!opSubtype && (
                  <>
                    <span className="text-slate-300 font-medium">Which element to delete?</span>
                    <button
                      onClick={() => setOpSubtype("start")}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition cursor-pointer"
                    >
                      First Element (Index 0)
                    </button>
                    <button
                      onClick={() => setOpSubtype("end")}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition cursor-pointer"
                    >
                      Last Element (End)
                    </button>
                    <button
                      onClick={() => setOpSubtype("index")}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
                    >
                      At Specific Index
                    </button>
                  </>
                )}

                {opSubtype && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {opSubtype === "index" && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Index:</span>
                        <input
                          type="number"
                          value={idxInput}
                          min={0}
                          max={Math.max(0, currentArray.length - 1)}
                          onChange={(e) => setIdxInput(e.target.value)}
                          disabled={isPlaying}
                          className="w-14 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}

                    <button
                      onClick={() => {
                        const targetIdx = opSubtype === "start" ? 0 : opSubtype === "end" ? currentArray.length - 1 : idxInput;
                        handleRunDelete(targetIdx);
                      }}
                      disabled={isPlaying || currentArray.length === 0}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
                    >
                      <span>🗑</span>
                      <span>Delete Element</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* LEVEL 2 & 3: SEARCH SUB-MENU */}
            {opCategory === "search" && (
              <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
                <button
                  onClick={() => {
                    if (opSubtype) setOpSubtype(null);
                    else setOpCategory(null);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
                >
                  ← Back
                </button>

                {!opSubtype && (
                  <>
                    <span className="text-slate-300 font-medium">Search Algorithm:</span>
                    <button
                      onClick={() => setOpSubtype("linear")}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer"
                    >
                      Linear Search O(n)
                    </button>
                    <button
                      onClick={() => setOpSubtype("binary")}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition cursor-pointer"
                    >
                      Binary Search O(log n)
                    </button>
                  </>
                )}

                {opSubtype && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-300 font-semibold">
                      {opSubtype === "binary" ? "Binary Search (auto-sorts)" : "Linear Search"}:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Target Value:</span>
                      <input
                        type="number"
                        value={valInput}
                        onChange={(e) => setValInput(e.target.value)}
                        disabled={isPlaying}
                        className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      onClick={() => handleRunSearch(opSubtype)}
                      disabled={isPlaying}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
                    >
                      <span>🔍</span>
                      <span>Find Value</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* LEVEL 2 & 3: ACCESS SUB-MENU */}
            {opCategory === "access" && (
              <div className="flex items-center gap-2 flex-wrap w-full animate-fadeIn">
                <button
                  onClick={() => setOpCategory(null)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
                >
                  ← Back
                </button>
                <span className="text-slate-300 font-medium">Access Element in O(1):</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Index:</span>
                  <input
                    type="number"
                    value={idxInput}
                    min={0}
                    max={Math.max(0, currentArray.length - 1)}
                    onChange={(e) => setIdxInput(e.target.value)}
                    disabled={isPlaying}
                    className="w-14 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={() => handleRunAccess(idxInput)}
                  disabled={isPlaying}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
                >
                  <span>⚡</span>
                  <span>Read Memory</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* ── 2D GRID OPERATIONS ── */}
        {type === "2d" && (
          <div className="flex items-center gap-2 flex-wrap w-full">
            <span className="text-slate-300 font-medium">Select Cell:</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Row:</span>
              <input
                type="number"
                min={0}
                max={2}
                value={rowInput}
                onChange={(e) => setRowInput(e.target.value)}
                disabled={isPlaying}
                className="w-12 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Col:</span>
              <input
                type="number"
                min={0}
                max={2}
                value={colInput}
                onChange={(e) => setColInput(e.target.value)}
                disabled={isPlaying}
                className="w-12 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center focus:outline-none"
              />
            </div>
            <button
              onClick={handle2DAccess}
              disabled={isPlaying}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <span>⚡</span>
              <span>Calculate Address</span>
            </button>
            <button
              onClick={handleReset}
              disabled={isPlaying}
              className="ml-auto px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition cursor-pointer"
            >
              ↺ Reset
            </button>
          </div>
        )}

        {/* ── DYNAMIC ARRAY OPERATIONS ── */}
        {type === "dynamic" && (
          <div className="flex items-center gap-2 flex-wrap w-full">
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
              onClick={handleDynPush}
              disabled={isPlaying}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <span>+</span>
              <span>Push to Array</span>
            </button>
            <button
              onClick={handleDynPop}
              disabled={isPlaying || dynArr.length === 0}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <span>-</span>
              <span>Pop Last</span>
            </button>
            <button
              onClick={handleReset}
              disabled={isPlaying}
              className="ml-auto px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition cursor-pointer"
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
        {/* 1D Array Canvas */}
        {type === "1d" && (
          <div className="flex items-center justify-center gap-2 py-4 px-2 min-w-max">
            {currentArray.map((val, idx) => {
              const status = activeStep.highlights?.[idx] || "default";
              let border = DSV_COLORS.default;
              let bg = "rgba(15, 23, 42, 0.7)";
              let textColor = "text-slate-100";

              if (status === "active") {
                border = DSV_COLORS.active;
                bg = "rgba(56, 189, 248, 0.25)";
                textColor = "text-sky-300";
              } else if (status === "comparing") {
                border = DSV_COLORS.comparing;
                bg = "rgba(245, 158, 11, 0.25)";
                textColor = "text-amber-300";
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
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-12 h-12 rounded-xl border-2 flex items-center justify-center font-mono font-bold text-sm shadow-sm transition-all duration-300"
                    style={{ borderColor: border, backgroundColor: bg }}
                  >
                    <span className={textColor}>{val !== null ? val : "∅"}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">[{idx}]</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 2D Grid Canvas */}
        {type === "2d" && (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="grid grid-cols-3 gap-2">
              {(activeStep.grid || grid2D).map((row, r) =>
                row.map((val, c) => {
                  const isActive =
                    activeStep.activeCell?.row === r && activeStep.activeCell?.col === c;
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center font-mono text-xs shadow-sm transition-all duration-300 ${
                        isActive
                          ? "border-sky-400 bg-sky-950/60 text-sky-200 shadow-md scale-105"
                          : "border-slate-800 bg-slate-900/60 text-slate-300"
                      }`}
                    >
                      <span className="font-bold text-sm">{val}</span>
                      <span className="text-[9px] text-slate-500">
                        [{r},{c}]
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Dynamic Array Canvas */}
        {type === "dynamic" && (
          <div className="flex flex-col items-center gap-3 w-full max-w-lg">
            <div className="flex items-center justify-between w-full font-mono text-xs text-slate-400 px-2">
              <span>
                Length: <strong className="text-emerald-400">{currentArray.length}</strong>
              </span>
              <span>
                Capacity: <strong className="text-indigo-400">{activeStep.capacity || dynCap}</strong>
              </span>
            </div>

            <div className="flex items-center justify-center gap-1.5 flex-wrap p-3 rounded-xl border border-slate-800 bg-slate-900/40 w-full min-h-[64px]">
              {Array.from({ length: activeStep.capacity || dynCap }).map((_, idx) => {
                const hasItem = idx < currentArray.length;
                const val = currentArray[idx];
                const status = activeStep.highlights?.[idx] || "default";

                let border = DSV_COLORS.default;
                let bg = "rgba(15, 23, 42, 0.4)";
                if (status === "active") {
                  border = DSV_COLORS.active;
                  bg = "rgba(56, 189, 248, 0.3)";
                } else if (status === "newNode") {
                  border = DSV_COLORS.newNode;
                  bg = "rgba(168, 85, 247, 0.3)";
                }

                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-11 h-11 rounded-lg border-2 flex items-center justify-center font-mono font-bold text-xs transition-all duration-300 ${
                        hasItem ? "text-slate-100" : "text-slate-600 border-dashed border-slate-800"
                      }`}
                      style={{
                        borderColor: hasItem ? border : undefined,
                        backgroundColor: hasItem ? bg : undefined,
                      }}
                    >
                      {hasItem ? val : "—"}
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">[{idx}]</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArrayVisualizer;
