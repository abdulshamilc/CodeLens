// src/tools/whiteboard/components/LayersPanel.jsx
// Floating layers manager for z-ordering, grouping, visibility, locking, and element inspection

import React, { useState } from "react";
import { useWhiteboardStore } from "../store/useWhiteboardStore";

function getElementIcon(type) {
  switch (type) {
    case "pen":
      return "✏️";
    case "brush":
      return "🖌️";
    case "rectangle":
    case "rounded-rect":
      return "▢";
    case "circle":
    case "ellipse":
      return "◯";
    case "triangle":
      return "△";
    case "diamond":
      return "◇";
    case "polygon":
      return "⬡";
    case "line":
    case "arrow":
    case "double-arrow":
      return "➔";
    case "connector-straight":
    case "connector-elbow":
    case "connector-curved":
      return "🔀";
    case "text":
      return "T";
    case "code-block":
      return "📝";
    case "database":
      return "🗄️";
    case "server":
      return "🖥️";
    case "client":
      return "💻";
    case "api-endpoint":
      return "⚡";
    case "component":
      return "📦";
    case "backend-service":
      return "⚙️";
    case "auth":
      return "🛡️";
    case "cloud":
      return "☁️";
    case "terminal":
      return "💻";
    case "browser":
      return "🌐";
    default:
      return "◽";
  }
}

export function LayersPanel() {
  const {
    elements,
    selectedIds,
    setSelectedIds,
    showLayersPanel,
    setShowLayersPanel,
    toggleLockElement,
    toggleHideElement,
    deleteSelected,
    duplicateSelected,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    groupSelected,
    ungroupSelected,
    renameElement,
  } = useWhiteboardStore();

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  if (!showLayersPanel) return null;

  // Render in top-to-bottom visual order (top of list = topmost canvas element)
  const reversedElements = [...elements].reverse();

  const startRename = (el) => {
    setEditingId(el.id);
    setEditName(el.name || `${el.type.charAt(0).toUpperCase() + el.type.slice(1)}`);
  };

  const commitRename = (id) => {
    if (editName.trim()) {
      renameElement(id, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <aside
      aria-label="Canvas Layers Inspector"
      className="absolute top-20 left-4 z-20 w-72 max-h-[calc(100vh-100px)] overflow-hidden rounded-2xl shadow-2xl backdrop-blur-xl transition-all select-none text-xs flex flex-col"
      style={{
        background: "rgba(15, 23, 42, 0.92)",
        border: "1px solid rgba(148, 163, 184, 0.22)",
        color: "#f8fafc",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-700/60">
        <div className="font-semibold text-sm flex items-center gap-1.5 text-indigo-300">
          <span>📚</span>
          <span>Layers ({elements.length})</span>
        </div>
        <button
          onClick={() => setShowLayersPanel(false)}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-bold"
          title="Close Layers Panel"
        >
          ✕
        </button>
      </div>

      {/* Layer Actions Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-slate-900/60 border-b border-slate-800">
        <button
          onClick={bringForward}
          disabled={selectedIds.length === 0}
          className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
          title="Bring Forward"
        >
          ▲ Up
        </button>
        <button
          onClick={sendBackward}
          disabled={selectedIds.length === 0}
          className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
          title="Send Backward"
        >
          ▼ Down
        </button>
        <button
          onClick={bringToFront}
          disabled={selectedIds.length === 0}
          className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
          title="Bring to Top"
        >
          ▲ Top
        </button>
        <button
          onClick={sendToBack}
          disabled={selectedIds.length === 0}
          className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
          title="Send to Bottom"
        >
          ▼ Bot
        </button>

        <div className="w-px h-4 bg-slate-700 mx-0.5" />

        <button
          onClick={groupSelected}
          disabled={selectedIds.length < 2}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
          title="Group Selected"
        >
          Group
        </button>
        <button
          onClick={ungroupSelected}
          disabled={selectedIds.length === 0}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
          title="Ungroup"
        >
          Ungroup
        </button>
      </div>

      {/* Elements List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[380px]">
        {reversedElements.length === 0 ? (
          <div className="p-6 text-center text-slate-500 italic">No elements on canvas</div>
        ) : (
          reversedElements.map((el) => {
            const isSelected = selectedIds.includes(el.id);
            const isEditing = editingId === el.id;

            return (
              <div
                key={el.id}
                onClick={(e) => {
                  if (e.shiftKey) {
                    setSelectedIds(
                      isSelected
                        ? selectedIds.filter((id) => id !== el.id)
                        : [...selectedIds, el.id]
                    );
                  } else {
                    setSelectedIds([el.id]);
                  }
                }}
                className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors cursor-pointer group ${
                  isSelected
                    ? "bg-indigo-600/30 border border-indigo-500/50 text-white"
                    : "hover:bg-slate-800/70 text-slate-300 border border-transparent"
                }`}
              >
                <span className="text-sm select-none">{getElementIcon(el.type)}</span>

                {isEditing ? (
                  <input
                    type="text"
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => commitRename(el.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(el.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 bg-slate-800 border border-indigo-500 rounded px-1 text-white outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startRename(el);
                    }}
                    className="flex-1 truncate text-xs"
                    title="Double-click to rename"
                  >
                    {el.name ||
                      (el.type === "text"
                        ? el.text?.slice(0, 16) || "Text"
                        : el.type === "code-block"
                        ? `Code (${el.language || "js"})`
                        : `${el.type}`)}
                  </span>
                )}

                {/* Lock button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLockElement(el.id);
                  }}
                  className={`p-1 rounded hover:bg-slate-700 transition-colors cursor-pointer text-xs ${
                    el.locked ? "text-amber-400 opacity-100" : "text-slate-500 opacity-40 group-hover:opacity-100"
                  }`}
                  title={el.locked ? "Unlock" : "Lock"}
                >
                  {el.locked ? "🔒" : "🔓"}
                </button>

                {/* Hide/Show button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHideElement(el.id);
                  }}
                  className={`p-1 rounded hover:bg-slate-700 transition-colors cursor-pointer text-xs ${
                    el.hidden ? "text-red-400 opacity-100" : "text-slate-500 opacity-40 group-hover:opacity-100"
                  }`}
                  title={el.hidden ? "Show" : "Hide"}
                >
                  {el.hidden ? "🚫" : "👁️"}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info & Delete */}
      {selectedIds.length > 0 && (
        <div className="p-2 border-t border-slate-700/60 bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {selectedIds.length} item{selectedIds.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={duplicateSelected}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
            >
              Duplicate
            </button>
            <button
              onClick={deleteSelected}
              className="px-2 py-1 rounded bg-red-600/30 hover:bg-red-600/50 text-red-200 text-[11px] cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

