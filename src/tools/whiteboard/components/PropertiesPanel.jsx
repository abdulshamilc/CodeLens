// src/tools/whiteboard/components/PropertiesPanel.jsx
// Floating contextual inspector for element properties, developer styling, text, and code formatting

import React from "react";
import { useWhiteboardStore } from "../store/useWhiteboardStore";
import { CODE_LANGUAGES } from "../types";

const PALETTE = [
  { label: "Transparent", value: "transparent" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Emerald", value: "#10b981" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Purple", value: "#a855f7" },
  { label: "White", value: "#ffffff" },
  { label: "Slate", value: "#94a3b8" },
  { label: "Dark Slate", value: "#1e293b" },
  { label: "Black", value: "#090d16" },
];

export function PropertiesPanel() {
  const {
    elements,
    selectedIds,
    showPropertiesPanel,
    setShowPropertiesPanel,
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    strokeWidth,
    setStrokeWidth,
    strokeStyle,
    setStrokeStyle,
    opacity,
    setOpacity,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    fontWeight,
    setFontWeight,
    fontStyle,
    setFontStyle,
    textDecoration,
    setTextDecoration,
    textAlign,
    setTextAlign,
    textBgColor,
    setTextBgColor,
    codeLanguage,
    setCodeLanguage,
    codeLineNumbers,
    setCodeLineNumbers,
    codeTheme,
    setCodeTheme,
    connectorRouting,
    setConnectorRouting,
    duplicateSelected,
    deleteSelected,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    toggleLockElement,
    updateElement,
  } = useWhiteboardStore();

  if (!showPropertiesPanel) return null;

  // Selected element inspection
  const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
  const primaryEl = selectedElements[0] || null;

  const isText = primaryEl?.type === "text";
  const isCode = primaryEl?.type === "code-block";
  const isConnector = primaryEl?.type?.startsWith("connector");
  const isShape = primaryEl && !isText && !isCode && !isConnector;
  const isLocked = primaryEl?.locked ?? false;

  return (
    <aside
      aria-label="Element Properties Inspector"
      className="absolute top-20 right-4 z-20 w-72 max-h-[calc(100vh-100px)] overflow-y-auto rounded-2xl p-4 shadow-2xl backdrop-blur-xl transition-all select-none text-xs flex flex-col gap-4"
      style={{
        background: "rgba(15, 23, 42, 0.90)",
        border: "1px solid rgba(148, 163, 184, 0.22)",
        color: "#f8fafc",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
        <div className="font-semibold text-sm flex items-center gap-1.5 text-indigo-300">
          <span>⚙️</span>
          <span>
            {selectedElements.length === 0
              ? "Canvas Defaults"
              : selectedElements.length === 1
              ? `${primaryEl.name || primaryEl.type.toUpperCase()}`
              : `${selectedElements.length} Elements Selected`}
          </span>
        </div>
        <button
          onClick={() => setShowPropertiesPanel(false)}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-bold"
          title="Close Properties Panel"
        >
          ✕
        </button>
      </div>

      {/* Stroke Color */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Stroke / Border Color
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PALETTE.filter((c) => c.value !== "transparent").map((c) => (
            <button
              key={c.value}
              onClick={() => setStrokeColor(c.value)}
              title={c.label}
              className="w-5 h-5 rounded-full border transition-transform cursor-pointer"
              style={{
                backgroundColor: c.value,
                borderColor:
                  (primaryEl ? primaryEl.strokeColor : strokeColor) === c.value
                    ? "#ffffff"
                    : "rgba(255,255,255,0.2)",
                transform:
                  (primaryEl ? primaryEl.strokeColor : strokeColor) === c.value
                    ? "scale(1.25)"
                    : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Fill Color */}
      {!isCode && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Fill Color
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PALETTE.map((c) => {
              const currentFill = primaryEl ? primaryEl.fillColor : fillColor;
              const isSelected = currentFill === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setFillColor(c.value)}
                  title={c.label}
                  className="w-5 h-5 rounded-full border transition-transform cursor-pointer relative"
                  style={{
                    backgroundColor: c.value === "transparent" ? "#0f172a" : c.value,
                    borderColor: isSelected ? "#ffffff" : "rgba(255,255,255,0.2)",
                    transform: isSelected ? "scale(1.25)" : "scale(1)",
                  }}
                >
                  {c.value === "transparent" && (
                    <span className="text-[10px] text-red-400 font-bold leading-none block">✕</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stroke Width & Style */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Width
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 4, 6].map((w) => {
              const currentW = primaryEl ? primaryEl.strokeWidth : strokeWidth;
              return (
                <button
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  className="flex-1 py-1 rounded bg-slate-800/80 hover:bg-slate-700 font-mono text-[11px] cursor-pointer transition-colors"
                  style={{
                    border: currentW === w ? "1px solid rgb(99, 102, 241)" : "1px solid transparent",
                    color: currentW === w ? "#ffffff" : "#94a3b8",
                  }}
                >
                  {w}px
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Style
          </label>
          <div className="flex items-center gap-1">
            {[
              { id: "solid", label: "──" },
              { id: "dashed", label: "╌╌" },
              { id: "dotted", label: "••" },
            ].map((s) => {
              const currentS = primaryEl ? primaryEl.strokeStyle : strokeStyle;
              return (
                <button
                  key={s.id}
                  onClick={() => setStrokeStyle(s.id)}
                  title={s.id}
                  className="flex-1 py-1 rounded bg-slate-800/80 hover:bg-slate-700 font-mono text-[11px] cursor-pointer transition-colors"
                  style={{
                    border: currentS === s.id ? "1px solid rgb(99, 102, 241)" : "1px solid transparent",
                    color: currentS === s.id ? "#ffffff" : "#94a3b8",
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Opacity Slider */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[11px] text-slate-400">
          <span className="font-semibold uppercase tracking-wider">Opacity</span>
          <span>{Math.round((primaryEl ? (primaryEl.opacity ?? 1) : opacity) * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={primaryEl ? (primaryEl.opacity ?? 1) : opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
          className="w-full accent-indigo-500 cursor-pointer"
        />
      </div>

      {/* Text Settings (for Text elements & Shape labels) */}
      {(isText || isShape) && (
        <div className="space-y-2 border-t border-slate-700/60 pt-3">
          <label className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
            <span>📝</span> Text Typography
          </label>

          <div className="flex items-center gap-1.5">
            <select
              value={primaryEl ? (primaryEl.fontFamily ?? fontFamily) : fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded p-1 text-slate-200 outline-none cursor-pointer"
            >
              <option value='"Inter", sans-serif'>Inter (Sans)</option>
              <option value='"Fira Code", monospace'>Fira Code (Mono)</option>
              <option value='Georgia, serif'>Georgia (Serif)</option>
            </select>

            <select
              value={primaryEl ? (primaryEl.fontSize ?? fontSize) : fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
              className="w-16 bg-slate-800 border border-slate-700 rounded p-1 text-slate-200 outline-none cursor-pointer"
            >
              {[12, 14, 16, 18, 20, 24, 32, 40].map((sz) => (
                <option key={sz} value={sz}>
                  {sz}px
                </option>
              ))}
            </select>
          </div>

          {/* Bold, Italic, Underline, Alignment */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFontWeight(fontWeight === "bold" ? "normal" : "bold")}
              className={`w-7 h-7 rounded font-bold transition-colors cursor-pointer ${
                fontWeight === "bold" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => setFontStyle(fontStyle === "italic" ? "normal" : "italic")}
              className={`w-7 h-7 rounded italic font-serif transition-colors cursor-pointer ${
                fontStyle === "italic" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
              title="Italic"
            >
              I
            </button>
            <button
              onClick={() =>
                setTextDecoration(textDecoration === "underline" ? "none" : "underline")
              }
              className={`w-7 h-7 rounded underline transition-colors cursor-pointer ${
                textDecoration === "underline"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
              title="Underline"
            >
              U
            </button>

            <div className="w-px h-5 bg-slate-700 mx-1" />

            <button
              onClick={() => setTextAlign("left")}
              className={`flex-1 py-1 rounded transition-colors cursor-pointer ${
                textAlign === "left" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
              title="Align Left"
            >
              ⫷
            </button>
            <button
              onClick={() => setTextAlign("center")}
              className={`flex-1 py-1 rounded transition-colors cursor-pointer ${
                textAlign === "center" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
              title="Align Center"
            >
              ≡
            </button>
            <button
              onClick={() => setTextAlign("right")}
              className={`flex-1 py-1 rounded transition-colors cursor-pointer ${
                textAlign === "right" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
              title="Align Right"
            >
              ⫸
            </button>
          </div>

          {/* Text Background Badge */}
          {isText && (
            <div className="space-y-1 pt-1">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider">
                Annotation Badge Background
              </label>
              <div className="flex items-center gap-1.5">
                {[
                  { label: "None", value: "transparent" },
                  { label: "Dark", value: "rgba(15, 23, 42, 0.85)" },
                  { label: "Indigo", value: "rgba(99, 102, 241, 0.2)" },
                  { label: "Amber", value: "rgba(245, 158, 11, 0.2)" },
                  { label: "Emerald", value: "rgba(16, 185, 129, 0.2)" },
                ].map((b) => (
                  <button
                    key={b.value}
                    onClick={() => setTextBgColor(b.value)}
                    className="flex-1 py-1 rounded border text-[10px] cursor-pointer"
                    style={{
                      backgroundColor: b.value === "transparent" ? "transparent" : b.value,
                      borderColor: textBgColor === b.value ? "#6366f1" : "rgba(148, 163, 184, 0.2)",
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Code Block Specific Options */}
      {isCode && (
        <div className="space-y-2 border-t border-slate-700/60 pt-3">
          <label className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
            <span>💻</span> Code Block Settings
          </label>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400">Language</label>
            <select
              value={primaryEl.language || codeLanguage}
              onChange={(e) => setCodeLanguage(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-slate-200 outline-none cursor-pointer"
            >
              {CODE_LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="text-[11px] text-slate-300 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={primaryEl.lineNumbers ?? codeLineNumbers}
                onChange={(e) => setCodeLineNumbers(e.target.checked)}
                className="accent-indigo-500 cursor-pointer"
              />
              <span>Show Line Numbers</span>
            </label>

            <button
              onClick={() => setCodeTheme(codeTheme === "dark" ? "light" : "dark")}
              className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700 cursor-pointer"
            >
              Theme: {codeTheme}
            </button>
          </div>
        </div>
      )}

      {/* Connector Specific Options */}
      {isConnector && (
        <div className="space-y-2 border-t border-slate-700/60 pt-3">
          <label className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
            <span>🔀</span> Connector Routing
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: "straight", label: "Straight" },
              { id: "elbow", label: "Elbow" },
              { id: "curved", label: "Curved" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setConnectorRouting(r.id)}
                className={`py-1 rounded text-center cursor-pointer transition-colors ${
                  (primaryEl.routing || connectorRouting) === r.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Connector Label */}
          <div className="space-y-1 pt-1">
            <label className="text-[10px] text-slate-400">Connector Label</label>
            <input
              type="text"
              placeholder="e.g. HTTP GET, triggers..."
              value={primaryEl.label || ""}
              onChange={(e) => updateElement(primaryEl.id, { label: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none"
            />
          </div>
        </div>
      )}

      {/* Action Buttons for Selected Elements */}
      {selectedElements.length > 0 && (
        <div className="space-y-2 border-t border-slate-700/60 pt-3">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Arrange & Actions
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={bringForward}
              className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer text-center"
              title="Bring Forward"
            >
              Bring Forward
            </button>
            <button
              onClick={sendBackward}
              className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer text-center"
              title="Send Backward"
            >
              Send Backward
            </button>
            <button
              onClick={bringToFront}
              className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer text-center"
              title="Bring to Front"
            >
              Bring to Front
            </button>
            <button
              onClick={sendToBack}
              className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer text-center"
              title="Send to Back"
            >
              Send to Back
            </button>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={duplicateSelected}
              className="flex-1 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 transition-colors cursor-pointer"
            >
              Duplicate
            </button>
            {primaryEl && (
              <button
                onClick={() => toggleLockElement(primaryEl.id)}
                className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isLocked
                    ? "bg-amber-600/30 text-amber-300 border-amber-500/40"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}
                title={isLocked ? "Unlock element" : "Lock element"}
              >
                {isLocked ? "🔒 Locked" : "🔓 Lock"}
              </button>
            )}
            <button
              onClick={deleteSelected}
              className="py-1.5 px-3 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 transition-colors cursor-pointer"
              title="Delete element"
            >
              🗑️
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

