// src/tools/whiteboard/components/WhiteboardToolbar.jsx
// Professional developer diagramming toolbar with categorized tools, styling, and zero keyboard shortcuts

import React, { useState, useRef, useEffect } from "react";
import { useWhiteboardStore } from "../store/useWhiteboardStore";
import {
  BASIC_TOOLS,
  SHAPE_TOOLS,
  CONNECTOR_TOOLS,
  DEVELOPER_TOOLS,
} from "../types";

export function WhiteboardToolbar({ onOpenExport }) {
  const {
    tool,
    setTool,
    strokeColor,
    setStrokeColor,
    viewport,
    zoomIn,
    zoomOut,
    resetViewport,
    undo,
    redo,
    undoStack,
    redoStack,
    clearCanvas,
    gridVisible,
    toggleGrid,
    snapToGrid,
    toggleSnapToGrid,
    canvasBackground,
    setCanvasBackground,
    showLayersPanel,
    setShowLayersPanel,
    showPropertiesPanel,
    setShowPropertiesPanel,
  } = useWhiteboardStore();

  const [activeMenu, setActiveMenu] = useState(null); // 'shapes' | 'dev' | 'connectors' | 'bg' | null
  const menuRef = useRef(null);

  // Close menus on clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, []);

  const selectTool = (toolId) => {
    setTool(toolId);
    setActiveMenu(null);
  };

  const isShapeActive = SHAPE_TOOLS.some((s) => s.id === tool);
  const isDevActive = DEVELOPER_TOOLS.some((d) => d.id === tool);
  const isConnectorActive = CONNECTOR_TOOLS.some((c) => c.id === tool);

  const currentShape = SHAPE_TOOLS.find((s) => s.id === tool) || SHAPE_TOOLS[0];
  const currentDev = DEVELOPER_TOOLS.find((d) => d.id === tool) || DEVELOPER_TOOLS[0];
  const currentConnector = CONNECTOR_TOOLS.find((c) => c.id === tool) || CONNECTOR_TOOLS[0];

  return (
    <aside
      ref={menuRef}
      aria-label="Whiteboard Toolbar"
      className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl shadow-2xl backdrop-blur-xl select-none"
      style={{
        background: "rgba(15, 23, 42, 0.90)",
        border: "1px solid rgba(148, 163, 184, 0.25)",
      }}
    >
      {/* ── Primary Tools (Select, Pan, Pencil, Brush, Eraser) ── */}
      <div className="flex items-center gap-1" role="toolbar" aria-label="Basic Tools">
        {BASIC_TOOLS.map((t) => {
          const isActive = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => selectTool(t.id)}
              title={t.name}
              className="relative w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
              style={{
                background: isActive ? "rgb(99, 102, 241)" : "transparent",
                color: isActive ? "#ffffff" : "rgb(203, 213, 225)",
                boxShadow: isActive ? "0 0 10px rgba(99, 102, 241, 0.5)" : "none",
              }}
            >
              <span>{t.icon}</span>
            </button>
          );
        })}
      </div>

      <div className="w-px h-6 bg-slate-700/80 mx-0.5" />

      {/* ── Text Tool ── */}
      <button
        onClick={() => selectTool("text")}
        title="Text & Annotation"
        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
        style={{
          background: tool === "text" ? "rgb(99, 102, 241)" : "transparent",
          color: tool === "text" ? "#ffffff" : "rgb(203, 213, 225)",
          boxShadow: tool === "text" ? "0 0 10px rgba(99, 102, 241, 0.5)" : "none",
        }}
      >
        <span>T</span>
      </button>

      {/* ── Code Block Tool ── */}
      <button
        onClick={() => selectTool("code-block")}
        title="Code Block"
        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all cursor-pointer"
        style={{
          background: tool === "code-block" ? "rgb(99, 102, 241)" : "transparent",
          color: tool === "code-block" ? "#ffffff" : "rgb(203, 213, 225)",
          boxShadow: tool === "code-block" ? "0 0 10px rgba(99, 102, 241, 0.5)" : "none",
        }}
      >
        <span>&lt;/&gt;</span>
      </button>

      <div className="w-px h-6 bg-slate-700/80 mx-0.5" />

      {/* ── Shapes Flyout ── */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === "shapes" ? null : "shapes")}
          title="Shapes Menu"
          className="h-8 px-2 rounded-xl flex items-center gap-1 font-bold text-xs transition-all cursor-pointer"
          style={{
            background: isShapeActive ? "rgb(99, 102, 241)" : "transparent",
            color: isShapeActive ? "#ffffff" : "rgb(203, 213, 225)",
            boxShadow: isShapeActive ? "0 0 10px rgba(99, 102, 241, 0.5)" : "none",
          }}
        >
          <span>{currentShape.icon}</span>
          <span className="text-[9px] opacity-70">▼</span>
        </button>

        {activeMenu === "shapes" && (
          <div
            className="absolute top-10 left-0 w-44 rounded-xl p-2 shadow-2xl backdrop-blur-xl border border-slate-700 bg-slate-900/95 z-50 grid grid-cols-2 gap-1 text-xs"
          >
            {SHAPE_TOOLS.map((s) => (
              <button
                key={s.id}
                onClick={() => selectTool(s.id)}
                className={`flex items-center gap-1.5 p-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                  tool === s.id ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                <span>{s.icon}</span>
                <span className="truncate">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Connectors Flyout ── */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === "connectors" ? null : "connectors")}
          title="Connectors Menu"
          className="h-8 px-2 rounded-xl flex items-center gap-1 font-bold text-xs transition-all cursor-pointer"
          style={{
            background: isConnectorActive ? "rgb(99, 102, 241)" : "transparent",
            color: isConnectorActive ? "#ffffff" : "rgb(203, 213, 225)",
            boxShadow: isConnectorActive ? "0 0 10px rgba(99, 102, 241, 0.5)" : "none",
          }}
        >
          <span>{currentConnector.icon}</span>
          <span className="text-[9px] opacity-70">▼</span>
        </button>

        {activeMenu === "connectors" && (
          <div
            className="absolute top-10 left-0 w-48 rounded-xl p-2 shadow-2xl backdrop-blur-xl border border-slate-700 bg-slate-900/95 z-50 flex flex-col gap-1 text-xs"
          >
            {CONNECTOR_TOOLS.map((c) => (
              <button
                key={c.id}
                onClick={() => selectTool(c.id)}
                className={`flex items-center gap-2 p-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                  tool === c.id ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                <span className="font-bold">{c.icon}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Developer Architecture Blocks Flyout ── */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === "dev" ? null : "dev")}
          title="Developer & Architecture Blocks"
          className="h-8 px-2.5 rounded-xl flex items-center gap-1 font-bold text-xs transition-all cursor-pointer"
          style={{
            background: isDevActive ? "rgb(99, 102, 241)" : "transparent",
            color: isDevActive ? "#ffffff" : "rgb(203, 213, 225)",
            boxShadow: isDevActive ? "0 0 10px rgba(99, 102, 241, 0.5)" : "none",
          }}
        >
          <span>{isDevActive ? currentDev.icon : "📐"}</span>
          <span className="hidden sm:inline">Blocks</span>
          <span className="text-[9px] opacity-70">▼</span>
        </button>

        {activeMenu === "dev" && (
          <div
            className="absolute top-10 left-0 w-64 max-h-80 overflow-y-auto rounded-xl p-2 shadow-2xl backdrop-blur-xl border border-slate-700 bg-slate-900/95 z-50 text-xs flex flex-col gap-2"
          >
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                Flowcharts & Workflows
              </div>
              <div className="grid grid-cols-2 gap-1">
                {DEVELOPER_TOOLS.filter((d) => d.category === "flowchart").map((d) => (
                  <button
                    key={d.id}
                    onClick={() => selectTool(d.id)}
                    className={`flex items-center gap-1.5 p-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                      tool === d.id ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>{d.icon}</span>
                    <span className="truncate">{d.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-1">
              <div className="px-2 py-1 text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                System & Architecture
              </div>
              <div className="grid grid-cols-2 gap-1">
                {DEVELOPER_TOOLS.filter((d) => d.category === "architecture" || d.category === "developer").map((d) => (
                  <button
                    key={d.id}
                    onClick={() => selectTool(d.id)}
                    className={`flex items-center gap-1.5 p-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                      tool === d.id ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>{d.icon}</span>
                    <span className="truncate">{d.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-slate-700/80 mx-0.5" />

      {/* ── Quick Color Chips ── */}
      <div className="flex items-center gap-1 px-1">
        {["#ffffff", "#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4"].map((c) => (
          <button
            key={c}
            onClick={() => setStrokeColor(c)}
            title={`Stroke color: ${c}`}
            className="w-4 h-4 rounded-full border transition-transform cursor-pointer"
            style={{
              backgroundColor: c,
              borderColor: strokeColor === c ? "#ffffff" : "rgba(255,255,255,0.2)",
              transform: strokeColor === c ? "scale(1.3)" : "scale(1)",
            }}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-slate-700/80 mx-0.5" />

      {/* ── Canvas Settings: Grid & Snap & Background ── */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleGrid}
          title="Toggle Grid"
          className={`w-7 h-7 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center justify-center ${
            gridVisible ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40" : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          ::
        </button>
        <button
          onClick={toggleSnapToGrid}
          title="Toggle Snap to Grid"
          className={`w-7 h-7 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center justify-center ${
            snapToGrid ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40" : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          ⌖
        </button>

        {/* Canvas Background Chooser */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === "bg" ? null : "bg")}
            title="Canvas Background"
            className="w-7 h-7 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center text-slate-300 hover:bg-slate-800"
          >
            🎨
          </button>
          {activeMenu === "bg" && (
            <div className="absolute top-9 left-0 w-32 rounded-xl p-1.5 shadow-2xl backdrop-blur-xl border border-slate-700 bg-slate-900/95 z-50 flex flex-col gap-1 text-xs">
              {[
                { id: "dark", label: "Dark Slate" },
                { id: "black", label: "Pure Black" },
                { id: "light", label: "Light" },
              ].map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => {
                    setCanvasBackground(bg.id);
                    setActiveMenu(null);
                  }}
                  className={`p-1.5 rounded text-left transition-colors cursor-pointer ${
                    canvasBackground === bg.id ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-px h-6 bg-slate-700/80 mx-0.5" />

      {/* ── Panels Toggles (Properties & Layers) ── */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowLayersPanel(!showLayersPanel)}
          title="Toggle Layers Panel"
          className={`px-2 py-1 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 ${
            showLayersPanel ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          <span>📚</span>
          <span className="hidden md:inline">Layers</span>
        </button>

        <button
          onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
          title="Toggle Properties Panel"
          className={`px-2 py-1 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 ${
            showPropertiesPanel ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          <span>⚙️</span>
          <span className="hidden md:inline">Inspect</span>
        </button>
      </div>

      <div className="w-px h-6 bg-slate-700/80 mx-0.5" />

      {/* ── Undo / Redo & Zoom ── */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          title="Undo"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-opacity cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-200"
        >
          ↩
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          title="Redo"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-opacity cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-200"
        >
          ↪
        </button>

        <button
          onClick={zoomOut}
          title="Zoom Out"
          className="w-6 h-7 rounded-lg flex items-center justify-center text-xs hover:bg-slate-800 text-slate-300 cursor-pointer"
        >
          −
        </button>
        <button
          onClick={resetViewport}
          title="Reset Zoom to 100%"
          className="px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-300 hover:bg-slate-800 cursor-pointer"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
        <button
          onClick={zoomIn}
          title="Zoom In"
          className="w-6 h-7 rounded-lg flex items-center justify-center text-xs hover:bg-slate-800 text-slate-300 cursor-pointer"
        >
          +
        </button>
      </div>

      <div className="w-px h-6 bg-slate-700/80 mx-0.5" />

      {/* ── Clear & Export ── */}
      <div className="flex items-center gap-1">
        <button
          onClick={clearCanvas}
          title="Clear Whiteboard"
          className="px-2 py-1 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
        >
          Clear
        </button>
        <button
          onClick={onOpenExport}
          title="Export Diagram (PNG, JPEG, SVG, JSON, PDF)"
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md hover:shadow-indigo-500/30 cursor-pointer flex items-center gap-1"
        >
          <span>Export</span>
          <span className="text-[10px]">▼</span>
        </button>
      </div>
    </aside>
  );
}
