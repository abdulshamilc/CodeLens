// src/tools/dbv/components/ControlBar.tsx
// Top control bar: Run, Step Back/Forward, Play/Pause, speed slider, Reset,
// step counter, and a timeline scrubber with event-type markers.
import React, { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useDBVStore } from "../store/useDBVStore";
const SPEED_OPTIONS = [
    { label: "Slow", ms: 1200 },
    { label: "Normal", ms: 600 },
    { label: "Fast", ms: 200 },
    { label: "Turbo", ms: 50 },
];
// Map event types to timeline dot colors
const EVENT_COLORS = {
    "creation-phase": "#f59e0b",
    "execution-phase": "#6366f1",
    "call": "#8b5cf6",
    "return": "#06b6d4",
    "assign": "#22c55e",
    "declare": "#84cc16",
    "hoisting": "#f59e0b",
    "tdz-error": "#ef4444",
    "throw": "#ef4444",
    "catch": "#f97316",
    "enqueue-task": "#a855f7",
    "event-loop-tick": "#ec4899",
};
export function ControlBar({ onRun }) {
    const { trace, currentStep, isPlaying, playbackSpeed, isRunning, setCurrentStep, setIsPlaying, setIsRunning, setPlaybackSpeed, stepForward, stepBack, setTrace, setRunError, cancelAllRunning, } = useDBVStore();
    const playIntervalRef = useRef(null);
    // Auto-advance during playback
    useEffect(() => {
        if (playIntervalRef.current)
            clearTimeout(playIntervalRef.current);
        if (!isPlaying || trace.length === 0)
            return;
        const advance = () => {
            const { currentStep: cs, trace: t, setCurrentStep: scs, setIsPlaying: sip } = useDBVStore.getState();
            if (cs >= t.length - 1) {
                sip(false);
                return;
            }
            scs(cs + 1);
            playIntervalRef.current = setTimeout(advance, playbackSpeed);
        };
        playIntervalRef.current = setTimeout(advance, playbackSpeed);
        return () => {
            if (playIntervalRef.current)
                clearTimeout(playIntervalRef.current);
        };
    }, [isPlaying, playbackSpeed, trace.length]);
    const handleReset = useCallback(() => {
        cancelAllRunning();
        setIsPlaying(false);
        setIsRunning(false);
        setTrace([]);
        setCurrentStep(0);
        setRunError(null);
    }, [cancelAllRunning, setIsPlaying, setIsRunning, setTrace, setCurrentStep, setRunError]);
    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e) => {
            const target = e.target;
            if (target.tagName === "INPUT" || target.isContentEditable)
                return;
            if (e.key === "ArrowRight")
                stepForward();
            if (e.key === "ArrowLeft")
                stepBack();
            if (e.key === " " && trace.length > 0) {
                e.preventDefault();
                setIsPlaying(!isPlaying);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [stepForward, stepBack, setIsPlaying, isPlaying, trace.length]);
    const totalSteps = trace.length;
    const hasTrace = totalSteps > 0;
    const atEnd = currentStep >= totalSteps - 1;
    const atStart = currentStep <= 0;
    return (<div className="flex flex-col gap-2 px-3 py-2 shrink-0" style={{
            background: "rgb(var(--color-surface))",
            borderBottom: "1px solid rgb(var(--color-border))",
        }}>
      {/* Top row: main controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Run / Analyze */}
        <motion.button id="dbv-run-btn" onClick={onRun} disabled={isRunning} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold" style={{
            background: isRunning
                ? "rgba(var(--color-accent), 0.4)"
                : "rgb(var(--color-accent))",
            color: "#fff",
            cursor: isRunning ? "wait" : "pointer",
        }} title="Run / Analyze (Ctrl+Enter)">
          {isRunning ? (<>
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
              Analyzing…
            </>) : (<>⚡ Run / Analyze</>)}
        </motion.button>

        {/* Divider */}
        <div className="w-px h-6" style={{ background: "rgb(var(--color-border))" }}/>

        {/* Step Back */}
        <CtrlBtn id="dbv-step-back" onClick={stepBack} disabled={!hasTrace || atStart} title="Step Back (←)" icon="◀"/>

        {/* Play/Pause */}
        <CtrlBtn id="dbv-play-pause" onClick={() => setIsPlaying(!isPlaying)} disabled={!hasTrace || atEnd} title={isPlaying ? "Pause (Space)" : "Play (Space)"} icon={isPlaying ? "⏸" : "▶"} accent/>

        {/* Step Forward */}
        <CtrlBtn id="dbv-step-fwd" onClick={stepForward} disabled={!hasTrace || atEnd} title="Step Forward (→)" icon="▶"/>

        {/* Divider */}
        <div className="w-px h-6" style={{ background: "rgb(var(--color-border))" }}/>

        {/* Speed */}
        <div className="flex items-center gap-1">
          <span className="text-xs" style={{ color: "rgb(var(--color-text-muted))" }}>Speed:</span>
          <div className="flex gap-1">
            {SPEED_OPTIONS.map((opt) => (<button key={opt.label} onClick={() => setPlaybackSpeed(opt.ms)} className="px-2 py-0.5 rounded text-xs font-medium transition-colors" style={{
                background: playbackSpeed === opt.ms ? "rgba(var(--color-accent), 0.2)" : "rgb(var(--color-surface2))",
                color: playbackSpeed === opt.ms ? "rgb(var(--color-accent))" : "rgb(var(--color-text-muted))",
                border: playbackSpeed === opt.ms ? "1px solid rgba(var(--color-accent),0.4)" : "1px solid transparent",
            }}>
                {opt.label}
              </button>))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6" style={{ background: "rgb(var(--color-border))" }}/>

        {/* Reset */}
        <CtrlBtn id="dbv-reset" onClick={handleReset} disabled={!hasTrace && !isRunning} title="Reset" icon="↺"/>

        {/* Step counter */}
        {hasTrace && (<div className="ml-auto text-xs font-code font-semibold px-2 py-1 rounded-md" style={{
                background: "rgb(var(--color-surface2))",
                color: "rgb(var(--color-text-muted))",
            }}>
            Step <span style={{ color: "rgb(var(--color-accent))" }}>{currentStep + 1}</span> / {totalSteps}
          </div>)}
      </div>

      {/* Timeline scrubber */}
      {hasTrace && (<div className="flex items-center gap-2">
          <input id="dbv-timeline-slider" type="range" min={0} max={totalSteps - 1} value={currentStep} onChange={(e) => {
                setIsPlaying(false);
                setCurrentStep(Number(e.target.value));
            }} className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer" style={{
                background: `linear-gradient(to right, rgb(var(--color-accent)) ${(currentStep / (totalSteps - 1)) * 100}%, rgb(var(--color-surface2)) 0%)`,
                accentColor: "rgb(var(--color-accent))",
            }} aria-label="Timeline scrubber"/>
          {/* Event-type mini markers (sampled to avoid overflow) */}
          <div className="relative h-3 flex-1 hidden lg:block" style={{ maxWidth: 200 }}>
            {trace
                .filter((_, i) => i % Math.max(1, Math.floor(totalSteps / 60)) === 0)
                .map((step, i) => {
                const color = EVENT_COLORS[step.eventType] ?? "#64748b";
                const pct = (step.index / (totalSteps - 1)) * 100;
                return (<div key={i} onClick={() => setCurrentStep(step.index)} className="absolute top-0 w-1 h-3 rounded-full cursor-pointer" style={{
                        left: `${pct}%`,
                        background: color,
                        opacity: 0.7,
                    }} title={step.eventType}/>);
            })}
          </div>
        </div>)}
    </div>);
}
// ─── Small control button ────────────────────────────────────────────────────
function CtrlBtn({ id, onClick, disabled, title, icon, accent, }) {
    return (<motion.button id={id} onClick={onClick} disabled={disabled} whileHover={!disabled ? { scale: 1.1 } : undefined} whileTap={!disabled ? { scale: 0.9 } : undefined} title={title} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors" style={{
            background: accent
                ? "rgba(var(--color-accent), 0.15)"
                : "rgb(var(--color-surface2))",
            color: disabled
                ? "rgb(var(--color-border))"
                : accent
                    ? "rgb(var(--color-accent))"
                    : "rgb(var(--color-text-muted))",
            cursor: disabled ? "not-allowed" : "pointer",
            border: accent ? "1px solid rgba(var(--color-accent), 0.3)" : "none",
        }}>
      {icon}
    </motion.button>);
}
