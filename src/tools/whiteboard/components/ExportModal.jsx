// src/tools/whiteboard/components/ExportModal.jsx
// Export & Backup modal supporting PNG, JPEG, SVG, PDF, and JSON diagram export/import

import React, { useState, useRef } from "react";
import { useWhiteboardStore } from "../store/useWhiteboardStore";
import {
  exportToPNG,
  exportToJPEG,
  exportToSVG,
  exportToPDF,
  exportToJSON,
  importFromJSON,
} from "../utils/export";

export function ExportModal({ isOpen, onClose }) {
  const { elements, setElements } = useWhiteboardStore();
  const [bgChoice, setBgChoice] = useState("dark");
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    setImportError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result;
        if (typeof text === "string") {
          const imported = importFromJSON(text);
          setElements(imported);
          onClose();
        }
      } catch (err) {
        setImportError(String(err.message || err));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
      style={{ background: "rgba(0, 0, 0, 0.75)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl relative flex flex-col gap-5"
        style={{
          background: "rgb(15, 23, 42)",
          border: "1px solid rgba(148, 163, 184, 0.25)",
          color: "rgb(248, 250, 252)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>🖼️</span> Export & Backup Diagram
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Export your diagram with {elements.length} element{elements.length !== 1 ? "s" : ""} to
          standard vector/raster images, printable PDF documents, or offline JSON project backups.
        </p>

        {/* Background Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Background Theme
          </label>
          <div className="grid grid-cols-3 gap-2">
            {["dark", "light", "transparent"].map((bg) => (
              <button
                key={bg}
                onClick={() => setBgChoice(bg)}
                className="px-3 py-2 rounded-xl text-xs font-medium capitalize border transition-all cursor-pointer"
                style={{
                  background:
                    bgChoice === bg ? "rgba(99, 102, 241, 0.3)" : "rgba(30, 41, 59, 0.7)",
                  borderColor: bgChoice === bg ? "rgb(99, 102, 241)" : "rgba(148, 163, 184, 0.2)",
                  color: bgChoice === bg ? "#ffffff" : "rgb(148, 163, 184)",
                }}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>

        {/* Export Buttons Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* PNG */}
          <button
            onClick={() => {
              exportToPNG(elements, bgChoice);
              onClose();
            }}
            className="flex flex-col p-3 rounded-xl border border-indigo-500/30 bg-indigo-600/15 hover:bg-indigo-600/25 transition-all text-left cursor-pointer group"
          >
            <div className="font-semibold text-xs text-white flex items-center justify-between">
              <span>PNG Image</span>
              <span className="text-[10px] px-1 rounded bg-indigo-500/30 text-indigo-300">2x HD</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">High-res raster for sharing</div>
          </button>

          {/* JPEG */}
          <button
            onClick={() => {
              exportToJPEG(elements, bgChoice);
              onClose();
            }}
            className="flex flex-col p-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-all text-left cursor-pointer group"
          >
            <div className="font-semibold text-xs text-white flex items-center justify-between">
              <span>JPEG Image</span>
              <span className="text-[10px] text-slate-400">Compressed</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Small file size raster</div>
          </button>

          {/* SVG */}
          <button
            onClick={() => {
              exportToSVG(elements, bgChoice);
              onClose();
            }}
            className="flex flex-col p-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-all text-left cursor-pointer group"
          >
            <div className="font-semibold text-xs text-white flex items-center justify-between">
              <span>SVG Vector</span>
              <span className="text-[10px] px-1 rounded bg-cyan-500/20 text-cyan-300">Scalable</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Infinite resolution vector</div>
          </button>

          {/* PDF */}
          <button
            onClick={() => {
              exportToPDF(elements, bgChoice);
              onClose();
            }}
            className="flex flex-col p-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-all text-left cursor-pointer group"
          >
            <div className="font-semibold text-xs text-white flex items-center justify-between">
              <span>PDF Document</span>
              <span className="text-[10px] px-1 rounded bg-rose-500/20 text-rose-300">Print</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Printable diagram doc</div>
          </button>
        </div>

        {/* JSON Backup & Import Section */}
        <div className="border-t border-slate-700/60 pt-3 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              exportToJSON(elements);
              onClose();
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 text-center cursor-pointer transition-colors"
          >
            💾 Export JSON Backup
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-xs font-semibold text-indigo-200 border border-indigo-500/40 text-center cursor-pointer transition-colors"
          >
            📂 Import JSON Backup
          </button>
        </div>

        {importError && (
          <div className="p-2 rounded-lg bg-red-900/40 border border-red-500/50 text-red-200 text-xs">
            {importError}
          </div>
        )}
      </div>
    </div>
  );
}
