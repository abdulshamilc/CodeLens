// src/tools/dbv/components/GuidedTour.jsx
// Interactive first-time Guided Tour for DBV (CodeLens Execution Engine & Visualizer)
// Provides an interactive spotlight walkthrough of Code Editor, Dual Execution modes,
// Call Stack, Memory & Heap Graph View, Event Loop / Concurrency, and Scrubber controls.

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../../shared/ui";

export const TOUR_STORAGE_KEY = "codelens_dbv_tour_completed";

export const TOUR_STEPS = [
  {
    id: "welcome",
    title: "Welcome to CodeLens DBV! 🚀",
    badge: "Interactive Overview",
    targetId: null,
    content:
      "DBV is an interactive Execution Engine & Memory Visualizer for JavaScript, TypeScript, and Python. It breaks down program execution step-by-step so you can see memory allocations, scope chains, and the event loop in action.",
    tip: "Take this quick 1-minute guided tour to explore all key panels and visualizer tools.",
    icon: "🎓",
  },
  {
    id: "code-zone",
    title: "VS Code Editor & Multi-Language 📝",
    badge: "Step 1: Code Zone",
    targetId: "dbv-code-zone",
    content:
      "A full CodeMirror 6 editor equipped with syntax highlighting, auto-formatting, line numbers, word wrapping, and breakpoint gutters. Click in the gutter next to any line number to set breakpoints.",
    tip: "Use the top language selector to switch between JavaScript (ES2024), TypeScript 5.8, or Python 3.12 seamlessly.",
    icon: "💻",
  },
  {
    id: "run-controls",
    title: "Dual Execution: Run vs. Visualize ⚡",
    badge: "Step 2: Execution Engine",
    targetId: "dbv-run-controls",
    content:
      "Choose how your code executes:\n• ▶ Run: Sandboxed Web Worker execution with loop protection and instant console output.\n• 👁 Visualize: Generates an AST trace to step through execution frame-by-frame with memory graphs.",
    tip: "Keyboard shortcuts: Press F5 or Ctrl+Enter to Run; press Ctrl+Shift+Enter to Visualize.",
    icon: "⚡",
  },
  {
    id: "examples",
    title: "60+ Educational Examples 📚",
    badge: "Step 3: Learning Library",
    targetId: "dbv-examples-btn",
    content:
      "Explore curated interactive examples covering Call Stack mechanics, Closures, Temporal Dead Zone, Hoisting, this binding, Prototypes, Promises, and the Event Loop.",
    tip: "Click 'Examples' anytime to jump into any concept with pre-configured verified code.",
    icon: "📚",
  },
  {
    id: "stage-panel",
    title: "Call Stack & Memory Heap Graph 🧠",
    badge: "Step 4: Memory Stage",
    targetId: "dbv-stage-panel",
    content:
      "Inspect the active Call Stack (Global vs Function Execution Contexts) and all variables in memory. Toggle between the structured Variable Table and the interactive SVG Heap Graph View to visualize reference pointers.",
    tip: "In Heap Graph View, stack variables point directly to heap objects, showing reference pointers and prototypes.",
    icon: "🧩",
  },
  {
    id: "event-loop",
    title: "Event Loop, Web APIs & Queues 🔄",
    badge: "Step 5: Concurrency",
    targetId: "dbv-event-loop-zone",
    content:
      "Watch JavaScript's concurrency model animate in real-time. See Web APIs (setTimeout, fetch), the Microtask Queue (Promises), and Macrotask Queue coordinate with the Event Loop.",
    tip: "Notice how microtasks drain completely before the next macrotask callback is processed.",
    icon: "🔄",
  },
  {
    id: "bottom-controls",
    title: "Timeline Scrubber & Breakpoint Jumps ⏭️",
    badge: "Step 6: Step-by-Step Stepper",
    targetId: "dbv-bottom-controls",
    content:
      "Navigate code execution at your own pace. Use 'Next Line' / 'Previous' buttons, scrub the timeline slider, or use F8 to jump directly between your breakpoints.",
    tip: "Use the Left and Right arrow keys on your keyboard for rapid line-by-line stepping.",
    icon: "🎛️",
  },
  {
    id: "console",
    title: "Live Console & Diagnostics 💻",
    badge: "Step 7: Real-Time Output",
    targetId: "zone-console",
    content:
      "View live console logs, return values, and structured error diagnostics with line-jumping. Easily switch tabs between Live Visualization logs and Native Run output.",
    tip: "Clicking any error reference automatically scrolls the editor and highlights the exact error line.",
    icon: "🖥️",
  },
];

export function GuidedTour({ isOpen, onClose, onComplete }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const tooltipRef = useRef(null);

  const activeStep = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];
  const totalSteps = TOUR_STEPS.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Measure target DOM element bounding rect
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !activeStep.targetId) {
      setTargetRect(null);
      return;
    }

    const el = document.getElementById(activeStep.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      // Ensure element is visible
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right,
        });
        return;
      }
    }
    setTargetRect(null);
  }, [isOpen, activeStep.targetId]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);
    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [updateTargetRect, currentStepIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    if (dontShowAgain && typeof window !== "undefined") {
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, "true");
      } catch {}
    }
    onClose?.();
  };

  const handleComplete = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, "true");
      } catch {}
    }
    onComplete?.();
    onClose?.();
  };

  if (!isOpen) return null;

  // Calculate tooltip placement
  const padding = 8;
  const tooltipWidth = 420;
  let tooltipStyle = {};

  if (!targetRect) {
    // Centered modal
    tooltipStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "min(92vw, 480px)",
    };
  } else {
    // Dynamic positioned card relative to targetRect
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const spaceRight = window.innerWidth - targetRect.right;

    let top = 0;
    let left = 0;

    // Prefer positioning below target if room exists
    if (spaceBelow >= 260) {
      top = targetRect.bottom + 14;
      left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, targetRect.left));
    } else if (spaceAbove >= 260) {
      // Position above
      top = Math.max(16, targetRect.top - 260);
      left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, targetRect.left));
    } else if (spaceRight >= tooltipWidth + 24) {
      // Position to the right
      top = Math.max(16, Math.min(window.innerHeight - 280, targetRect.top));
      left = targetRect.right + 14;
    } else {
      // Float gracefully inside screen center
      top = Math.max(16, Math.min(window.innerHeight - 300, targetRect.top + 20));
      left = Math.max(16, (window.innerWidth - tooltipWidth) / 2);
    }

    tooltipStyle = {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      maxWidth: "calc(100vw - 32px)",
    };
  }

  return (
    <div
      aria-label="CodeLens DBV Guided Tour"
      className="fixed inset-0 z-50 overflow-hidden select-none"
    >
      {/* SVG Spotlight Mask Cutout */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto transition-all duration-300"
        style={{ width: "100vw", height: "100vh" }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White covers entire viewport (transparent cutout) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="14"
                ry="14"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Darkened overlay masked by target element cutout */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.78)"
          mask="url(#tour-spotlight-mask)"
        />

        {/* Glowing highlight border around active target */}
        {targetRect && (
          <rect
            x={targetRect.left - padding}
            y={targetRect.top - padding}
            width={targetRect.width + padding * 2}
            height={targetRect.height + padding * 2}
            rx="14"
            ry="14"
            fill="none"
            stroke="rgb(99, 102, 241)"
            strokeWidth="2.5"
            strokeDasharray="6 3"
            className="animate-pulse"
            style={{
              filter: "drop-shadow(0 0 12px rgba(99, 102, 241, 0.75))",
            }}
          />
        )}
      </svg>

      {/* Tour Dialog Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep.id}
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{
            ...tooltipStyle,
            background: "rgba(15, 23, 42, 0.96)",
            borderColor: "rgba(99, 102, 241, 0.45)",
            boxShadow: "0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 25px rgba(99, 102, 241, 0.25)",
          }}
          className="rounded-2xl border p-5 text-slate-100 flex flex-col gap-3.5 backdrop-blur-2xl z-50 pointer-events-auto"
        >
          {/* Card Top: Badge, Step Indicator & Close */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">{activeStep.icon}</span>
              <span className="text-[11px] font-bold font-mono tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {activeStep.badge}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-slate-400">
                {currentStepIndex + 1} / {totalSteps}
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="w-6 h-6 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                title="Skip tour (Esc)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Title & Body */}
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
              {activeStep.title}
            </h3>
            <div className="text-xs sm:text-[13px] text-slate-300 leading-relaxed whitespace-pre-line">
              {activeStep.content}
            </div>
          </div>

          {/* Pro Tip Box */}
          {activeStep.tip && (
            <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 flex items-start gap-2 text-xs text-indigo-200">
              <span className="text-sm shrink-0">💡</span>
              <div className="leading-snug">
                <strong className="text-indigo-300">Pro Tip: </strong>
                {activeStep.tip}
              </div>
            </div>
          )}

          {/* Step Progress Dots */}
          <div className="flex items-center justify-center gap-1.5 py-1">
            {TOUR_STEPS.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? "w-6 bg-indigo-500 shadow-sm"
                    : "w-2 bg-slate-700 hover:bg-slate-500"
                }`}
                title={`Go to step ${idx + 1}: ${step.title}`}
              />
            ))}
          </div>

          {/* Card Footer: Navigation Buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded accent-indigo-500 cursor-pointer"
              />
              <span>Don't show on start</span>
            </label>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={handlePrev}
                  className="text-xs px-2.5 py-1 font-semibold cursor-pointer"
                >
                  ← Back
                </Button>
              )}

              <Button
                size="xs"
                variant="primary"
                onClick={handleNext}
                className="text-xs px-3.5 py-1 font-bold shadow-md cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isLastStep ? "Finish Tour 🎉" : "Next →"}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

