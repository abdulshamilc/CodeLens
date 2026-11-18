// src/tools/whiteboard/components/DataStructureModal.jsx
// Modal dialog allowing users to pick and insert any of the 8 core Data Structure templates

import React, { useEffect } from "react";
import { DATA_STRUCTURE_OPTIONS } from "../utils/dataStructureTemplates";

export function DataStructureModal({ isOpen, onClose, onSelectStructure }) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ds-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🌳</span>
            <div>
              <h2 id="ds-modal-title" className="text-base sm:text-lg font-bold text-white">
                Data Structure Templates
              </h2>
              <p className="text-xs text-slate-400">
                Choose a data structure to insert an editable whiteboard diagram onto the canvas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DATA_STRUCTURE_OPTIONS.map((ds) => (
            <button
              key={ds.id}
              onClick={() => {
                onSelectStructure(ds.id);
                onClose();
              }}
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-200 transition-colors text-left cursor-pointer group"
            >
              <span className="text-2xl leading-none mt-0.5">{ds.icon}</span>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-indigo-300 group-hover:text-indigo-200 text-sm mb-0.5 truncate">
                  {ds.title}
                </div>
                <p className="text-xs text-slate-400 leading-snug line-clamp-2">
                  {ds.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Click any structure to insert at the center of your view.</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
