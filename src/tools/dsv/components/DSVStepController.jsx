// src/tools/dsv/components/DSVStepController.jsx
// Minimal, beginner-friendly playback controller: Only Play/Pause + Speed + Step Counter

import React, { useEffect } from "react";

const SPEED_PRESETS = [
  { label: "Slow", ms: 900 },
  { label: "Normal", ms: 500 },
  { label: "Fast", ms: 250 },
];

export function DSVStepController({
  currentStep = 0,
  totalSteps = 1,
  isPlaying = false,
  onPlayPause,
  onStepChange,
  speed = 500,
  onSpeedChange,
  disabled = false,
}) {
  const isFinished = totalSteps > 1 && currentStep >= totalSteps - 1;

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    if (currentStep >= totalSteps - 1) {
      onPlayPause?.(false);
      return;
    }

    const timer = setTimeout(() => {
      onStepChange?.((prev) => Math.min(totalSteps - 1, prev + 1));
    }, speed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, totalSteps, speed, onStepChange, onPlayPause]);

  const handleTogglePlay = () => {
    if (disabled || totalSteps <= 1) return;
    if (isFinished) {
      // Replay from beginning
      onStepChange?.(0);
      onPlayPause?.(true);
    } else {
      onPlayPause?.(!isPlaying);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 w-full py-1.5 px-3 rounded-xl border border-slate-800 bg-slate-900/60 select-none text-xs">
      {/* Play / Pause / Replay Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleTogglePlay}
          disabled={disabled || totalSteps <= 1}
          title={isPlaying ? "Pause animation" : isFinished ? "Replay animation" : "Play animation"}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm text-xs ${
            isPlaying
              ? "bg-amber-600 hover:bg-amber-500 text-white"
              : isFinished
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isPlaying ? (
            <>
              <span>⏸</span>
              <span>Pause</span>
            </>
          ) : isFinished ? (
            <>
              <span>↺</span>
              <span>Replay</span>
            </>
          ) : (
            <>
              <span>▶</span>
              <span>Play</span>
            </>
          )}
        </button>

        {/* Step Indicator */}
        <span className="font-mono text-slate-400 text-[11px]">
          Step <strong className="text-slate-200">{totalSteps > 0 ? currentStep + 1 : 0}</strong> of{" "}
          <strong className="text-slate-200">{totalSteps}</strong>
        </span>
      </div>

      {/* Speed Selector */}
      <div className="flex items-center gap-1">
        <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Speed:</span>
        {SPEED_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onSpeedChange?.(p.ms)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
              speed === p.ms
                ? "bg-indigo-600 text-white font-bold"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default DSVStepController;
