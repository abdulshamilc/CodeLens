// src/tools/dbv/components/editor/EditorChrome.jsx
// VS Code-style editor chrome: Tab bar, quick actions, and status bar

import React, { useState } from "react";
import { EditorSettingsModal } from "./EditorSettingsModal";

export function EditorChrome({
  fileName = "main.js",
  isDirty = false,
  cursorPos = { line: 1, col: 1 },
  selectionCount = 0,
  breakpointCount = 0,
  problemCount = 0,
  settings,
  onUpdateSettings,
  onFormat,
  onOpenProblems,
  children,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="flex flex-col w-full h-full overflow-hidden select-none" style={{ background: "rgb(var(--color-bg))" }}>
      {/* Top Tab Bar */}
      <div
        className="flex items-center justify-between px-2 h-9 border-b shrink-0 text-xs"
        style={{
          background: "rgba(var(--color-surface), 0.6)",
          borderColor: "rgba(var(--color-border), 0.8)",
          color: "rgb(var(--color-text))",
        }}
      >
        {/* Left: Active File Tab */}
        <div className="flex items-center gap-1 h-full">
          <div
            className="flex items-center gap-2 px-3 h-full border-r border-t-2 font-medium cursor-default transition-all"
            style={{
              background: "rgb(var(--color-bg))",
              borderColor: "rgba(var(--color-border), 0.8)",
              borderTopColor: "rgb(var(--color-accent))",
            }}
          >
            {/* JS Logo Icon */}
            <span
              className="w-4 h-4 rounded text-[9px] font-black flex items-center justify-center shadow-xs"
              style={{ background: "#f7df1e", color: "#000000" }}
            >
              JS
            </span>
            <span className="font-mono text-slate-200">{fileName}</span>
            {isDirty && (
              <span
                className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5"
                title="Unsaved / modified code"
              />
            )}
          </div>
        </div>

        {/* Right: Quick action toolbar */}
        <div className="flex items-center gap-1 text-slate-400">
          {/* Format button */}
          <button
            type="button"
            onClick={onFormat}
            className="p-1.5 rounded hover:text-white hover:bg-slate-700/50 transition-colors flex items-center gap-1"
            title="Format Code (Shift+Alt+F)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
            </svg>
            <span className="hidden sm:inline text-[11px]">Format</span>
          </button>

          {/* Word wrap toggle */}
          <button
            type="button"
            onClick={() => onUpdateSettings({ wordWrap: !settings.wordWrap })}
            className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
              settings.wordWrap ? "text-indigo-400 bg-indigo-500/10 font-medium" : "hover:text-white hover:bg-slate-700/50"
            }`}
            title={`Toggle Word Wrap (${settings.wordWrap ? "On" : "Off"})`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h11a4 4 0 010 8h-1m0 0l2-2m-2 2l2 2M3 6h18M3 14h6M3 18h4" />
            </svg>
            <span className="hidden md:inline text-[11px]">Wrap</span>
          </button>

          {/* Minimap toggle */}
          <button
            type="button"
            onClick={() => onUpdateSettings({ minimap: !settings.minimap })}
            className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
              settings.minimap ? "text-indigo-400 bg-indigo-500/10 font-medium" : "hover:text-white hover:bg-slate-700/50"
            }`}
            title={`Toggle Minimap (${settings.minimap ? "On" : "Off"})`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M15 3v18" />
            </svg>
            <span className="hidden md:inline text-[11px]">Map</span>
          </button>

          {/* Font size zoom */}
          <div className="flex items-center gap-0.5 ml-1 border-l border-slate-700/60 pl-1.5">
            <button
              type="button"
              onClick={() => onUpdateSettings({ fontSize: Math.max(9, settings.fontSize - 1) })}
              className="w-5 h-5 rounded hover:bg-slate-700/50 flex items-center justify-center font-bold text-xs"
              title="Decrease Font Size"
            >
              -
            </button>
            <span className="text-[11px] font-mono px-0.5 text-slate-300">{settings.fontSize}px</span>
            <button
              type="button"
              onClick={() => onUpdateSettings({ fontSize: Math.min(24, settings.fontSize + 1) })}
              className="w-5 h-5 rounded hover:bg-slate-700/50 flex items-center justify-center font-bold text-xs"
              title="Increase Font Size"
            >
              +
            </button>
          </div>

          {/* Settings modal trigger */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded hover:text-white hover:bg-slate-700/50 transition-colors ml-0.5"
            title="Editor Settings"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Code Editor body container */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        {children}
      </div>

      {/* Bottom Status Bar */}
      <div
        className="flex items-center justify-between px-3 h-6 border-t shrink-0 text-[11px] font-mono select-none"
        style={{
          background: "rgba(var(--color-surface), 0.7)",
          borderColor: "rgba(var(--color-border), 0.8)",
          color: "rgb(var(--color-text))",
        }}
      >
        {/* Left indicators */}
        <div className="flex items-center gap-3">
          {/* Problems */}
          <button
            type="button"
            onClick={onOpenProblems}
            className="flex items-center gap-1 hover:text-indigo-400 transition-colors"
            title="Diagnostics / Problems"
          >
            {problemCount > 0 ? (
              <>
                <svg className="w-3 h-3 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-red-400">{problemCount} Problems</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-slate-400">0 Problems</span>
              </>
            )}
          </button>

          {/* Breakpoints count */}
          {breakpointCount > 0 && (
            <span className="flex items-center gap-1 text-slate-400" title={`${breakpointCount} active breakpoint(s)`}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>{breakpointCount} Breakpoints</span>
            </span>
          )}
        </div>

        {/* Right indicators */}
        <div className="flex items-center gap-3 text-slate-400">
          <span>
            Ln {cursorPos.line}, Col {cursorPos.col}
            {selectionCount > 0 && ` (${selectionCount} sel)`}
          </span>
          <button
            type="button"
            onClick={() => onUpdateSettings({ tabSize: settings.tabSize === 2 ? 4 : 2 })}
            className="hover:text-white transition-colors"
            title="Click to toggle tab spaces (2 / 4)"
          >
            Spaces: {settings.tabSize}
          </button>
          <span className="hidden sm:inline">UTF-8</span>
          <span className="font-semibold text-indigo-400">JavaScript</span>
        </div>
      </div>

      {/* Editor Settings Modal */}
      <EditorSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdate={onUpdateSettings}
      />
    </div>
  );
}
