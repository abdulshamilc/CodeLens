// src/tools/whiteboard/components/WhiteboardToolbar.tsx
// Sleek floating glassmorphism toolbar for tool selection, colors, widths, and actions
import React from "react";
import { motion } from "framer-motion";
import { useWhiteboardStore } from "../store/useWhiteboardStore";
const TOOLS = [
    { type: "select", label: "Select (V)", icon: "↖", shortcut: "V" },
    { type: "hand", label: "Hand / Pan (H)", icon: "✋", shortcut: "H" },
    { type: "pen", label: "Draw Pen (P)", icon: "✏️", shortcut: "P" },
    { type: "rectangle", label: "Rectangle (R)", icon: "▢", shortcut: "R" },
    { type: "ellipse", label: "Ellipse (O)", icon: "◯", shortcut: "O" },
    { type: "arrow", label: "Arrow (A)", icon: "➔", shortcut: "A" },
    { type: "line", label: "Line (L)", icon: "╱", shortcut: "L" },
    { type: "text", label: "Text (T)", icon: "T", shortcut: "T" },
    { type: "eraser", label: "Eraser (E)", icon: "⌫", shortcut: "E" },
];
const COLORS = [
    { label: "White", value: "#ffffff" },
    { label: "Indigo", value: "#6366f1" },
    { label: "Emerald", value: "#10b981" },
    { label: "Amber", value: "#f59e0b" },
    { label: "Rose", value: "#f43f5e" },
    { label: "Cyan", value: "#06b6d4" },
    { label: "Slate", value: "#94a3b8" },
];
const STROKE_WIDTHS = [2, 4, 6];
export function WhiteboardToolbar({ onOpenExport }) {
    const { tool, setTool, strokeColor, setStrokeColor, strokeWidth, setStrokeWidth, strokeStyle, setStrokeStyle, viewport, zoomIn, zoomOut, resetViewport, undo, redo, undoStack, redoStack, clearCanvas, } = useWhiteboardStore();
    return (<aside aria-label="Whiteboard Controls" className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md transition-all select-none" style={{
            background: "rgba(15, 23, 42, 0.82)",
            border: "1px solid rgba(148, 163, 184, 0.25)",
        }}>
      {/* Tool buttons */}
      <div className="flex items-center gap-1" role="toolbar" aria-label="Drawing Tools">
        {TOOLS.map((t) => {
            const isActive = tool === t.type;
            return (<motion.button key={t.type} whileTap={{ scale: 0.94 }} onClick={() => setTool(t.type)} title={t.label} className="relative w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-colors cursor-pointer" style={{
                    background: isActive ? "rgb(99, 102, 241)" : "transparent",
                    color: isActive ? "#ffffff" : "rgb(203, 213, 225)",
                }} aria-pressed={isActive}>
              <span>{t.icon}</span>
              {isActive && (<motion.div layoutId="activeToolGlow" className="absolute inset-0 rounded-xl" style={{
                        boxShadow: "0 0 12px rgba(99, 102, 241, 0.6)",
                    }}/>)}
            </motion.button>);
        })}
      </div>

      <div className="w-px h-6 bg-slate-700 mx-1"/>

      {/* Color chips */}
      <div className="flex items-center gap-1.5 px-1">
        {COLORS.map((c) => (<button key={c.value} onClick={() => setStrokeColor(c.value)} title={c.label} className="w-5 h-5 rounded-full border transition-transform cursor-pointer" style={{
                backgroundColor: c.value,
                borderColor: strokeColor === c.value ? "#ffffff" : "rgba(255,255,255,0.2)",
                transform: strokeColor === c.value ? "scale(1.2)" : "scale(1)",
                boxShadow: strokeColor === c.value ? "0 0 8px rgba(255,255,255,0.4)" : "none",
            }}/>))}
      </div>

      <div className="w-px h-6 bg-slate-700 mx-1"/>

      {/* Stroke width selector */}
      <div className="flex items-center gap-1">
        {STROKE_WIDTHS.map((w) => (<button key={w} onClick={() => setStrokeWidth(w)} title={`Stroke Width ${w}px`} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-xs" style={{
                background: strokeWidth === w ? "rgba(99, 102, 241, 0.3)" : "transparent",
                color: strokeWidth === w ? "#ffffff" : "rgb(148, 163, 184)",
                border: strokeWidth === w ? "1px solid rgba(99, 102, 241, 0.5)" : "1px solid transparent",
            }}>
            <div className="rounded-full bg-current" style={{ width: `${w * 2}px`, height: `${w * 2}px` }}/>
          </button>))}
      </div>

      {/* Stroke Style: Solid vs Dashed */}
      <button onClick={() => setStrokeStyle(strokeStyle === "solid" ? "dashed" : "solid")} title={`Style: ${strokeStyle}`} className="px-2 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer" style={{
            background: strokeStyle === "dashed" ? "rgba(99, 102, 241, 0.3)" : "transparent",
            color: strokeStyle === "dashed" ? "#ffffff" : "rgb(148, 163, 184)",
            border: "1px solid rgba(148, 163, 184, 0.2)",
        }}>
        {strokeStyle === "solid" ? "──" : "╌╌"}
      </button>

      <div className="w-px h-6 bg-slate-700 mx-1"/>

      {/* History and Viewport Actions */}
      <div className="flex items-center gap-1">
        <button onClick={undo} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)" className="w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-opacity cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-200">
          ↩
        </button>
        <button onClick={redo} disabled={redoStack.length === 0} title="Redo (Ctrl+Shift+Z)" className="w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-opacity cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-200">
          ↪
        </button>

        {/* Zoom controls */}
        <button onClick={zoomOut} title="Zoom Out" className="w-7 h-7 rounded-lg flex items-center justify-center text-xs hover:bg-slate-800 text-slate-300 cursor-pointer">
          −
        </button>
        <button onClick={resetViewport} title="Reset Zoom to 100%" className="px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-300 hover:bg-slate-800 cursor-pointer">
          {Math.round(viewport.zoom * 100)}%
        </button>
        <button onClick={zoomIn} title="Zoom In" className="w-7 h-7 rounded-lg flex items-center justify-center text-xs hover:bg-slate-800 text-slate-300 cursor-pointer">
          +
        </button>
      </div>

      <div className="w-px h-6 bg-slate-700 mx-1"/>

      {/* Clear & Export buttons */}
      <div className="flex items-center gap-1">
        <button onClick={clearCanvas} title="Clear Whiteboard" className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer">
          Clear
        </button>
        <button onClick={onOpenExport} title="Export Canvas (PNG, SVG, JSON)" className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md hover:shadow-indigo-500/30 cursor-pointer flex items-center gap-1">
          <span>Export</span>
          <span className="text-[10px]">▼</span>
        </button>
      </div>
    </aside>);
}
