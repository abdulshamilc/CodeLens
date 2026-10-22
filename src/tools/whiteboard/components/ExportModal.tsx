// src/tools/whiteboard/components/ExportModal.tsx
// Modal for exporting the Whiteboard to PNG, SVG, or JSON

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWhiteboardStore } from "../store/useWhiteboardStore";
import { exportToPNG, exportToSVG, exportToJSON } from "../utils/export";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { elements } = useWhiteboardStore();
  const [bgChoice, setBgChoice] = useState<"dark" | "light" | "transparent">("dark");

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        style={{ background: "rgba(0, 0, 0, 0.65)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md rounded-2xl p-6 shadow-2xl relative"
          style={{
            background: "rgb(15, 23, 42)",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            color: "rgb(248, 250, 252)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold font-display flex items-center gap-2">
              <span>🖼️</span> Export Whiteboard
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer text-lg font-bold"
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-slate-400 mb-6">
            Export all {elements.length} element{elements.length !== 1 ? "s" : ""} on your canvas to high-resolution image or vector formats.
          </p>

          {/* Background selector for PNG */}
          <div className="mb-6 space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Background Color (PNG)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["dark", "light", "transparent"] as const).map((bg) => (
                <button
                  key={bg}
                  onClick={() => setBgChoice(bg)}
                  className="px-3 py-2 rounded-xl text-xs font-medium capitalize border transition-all cursor-pointer"
                  style={{
                    background: bgChoice === bg ? "rgba(99, 102, 241, 0.25)" : "rgba(30, 41, 59, 0.7)",
                    borderColor: bgChoice === bg ? "rgb(99, 102, 241)" : "rgba(148, 163, 184, 0.2)",
                    color: bgChoice === bg ? "#ffffff" : "rgb(148, 163, 184)",
                  }}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <button
              onClick={() => {
                exportToPNG(elements, bgChoice);
                onClose();
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-600/15 hover:bg-indigo-600/25 transition-all text-left group cursor-pointer"
            >
              <div>
                <div className="font-semibold text-sm text-white flex items-center gap-2">
                  <span>PNG Image</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300">
                    2x Retina
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">High-res raster image for sharing and presentations</div>
              </div>
              <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">➔</span>
            </button>

            <button
              onClick={() => {
                exportToSVG(elements);
                onClose();
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-all text-left group cursor-pointer"
            >
              <div>
                <div className="font-semibold text-sm text-white">SVG Vector</div>
                <div className="text-xs text-slate-400 mt-0.5">Scalable vector graphics without loss of quality</div>
              </div>
              <span className="text-slate-400 group-hover:translate-x-1 transition-transform">➔</span>
            </button>

            <button
              onClick={() => {
                exportToJSON(elements);
                onClose();
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-all text-left group cursor-pointer"
            >
              <div>
                <div className="font-semibold text-sm text-white">JSON Backup</div>
                <div className="text-xs text-slate-400 mt-0.5">Raw canvas element data for offline backup or transfer</div>
              </div>
              <span className="text-slate-400 group-hover:translate-x-1 transition-transform">➔</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
