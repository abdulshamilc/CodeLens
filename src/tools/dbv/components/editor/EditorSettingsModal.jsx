// src/tools/dbv/components/editor/EditorSettingsModal.jsx
// Settings modal for configuring CodeMirror editor features

import React from "react";
import { DEFAULT_EDITOR_SETTINGS } from "../../editor/editorSettings";

export function EditorSettingsModal({ isOpen, onClose, settings, onUpdate }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl p-5 shadow-2xl border transition-all"
        style={{
          background: "rgb(var(--color-surface))",
          borderColor: "rgba(var(--color-border), 0.8)",
          color: "rgb(var(--color-text))",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Editor Settings"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-base font-semibold">Editor Preferences</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Settings options */}
        <div className="py-4 space-y-4 text-sm max-h-[70vh] overflow-y-auto">
          {/* Font size */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Font Size</span>
              <p className="text-xs text-slate-400">Editor text size in pixels (9 - 24)</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onUpdate({ fontSize: Math.max(9, settings.fontSize - 1) })}
                className="w-7 h-7 rounded border border-slate-700 hover:bg-slate-700/60 flex items-center justify-center font-bold"
                title="Decrease font size"
              >
                -
              </button>
              <span className="w-8 text-center font-mono font-semibold">{settings.fontSize}px</span>
              <button
                type="button"
                onClick={() => onUpdate({ fontSize: Math.min(24, settings.fontSize + 1) })}
                className="w-7 h-7 rounded border border-slate-700 hover:bg-slate-700/60 flex items-center justify-center font-bold"
                title="Increase font size"
              >
                +
              </button>
            </div>
          </div>

          {/* Tab size */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Tab Size</span>
              <p className="text-xs text-slate-400">Number of spaces per indentation level</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/80">
              <button
                type="button"
                onClick={() => onUpdate({ tabSize: 2 })}
                className={`px-2.5 py-1 text-xs rounded-md transition-all font-mono ${
                  settings.tabSize === 2 ? "bg-indigo-600 text-white font-semibold shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                2 spaces
              </button>
              <button
                type="button"
                onClick={() => onUpdate({ tabSize: 4 })}
                className={`px-2.5 py-1 text-xs rounded-md transition-all font-mono ${
                  settings.tabSize === 4 ? "bg-indigo-600 text-white font-semibold shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                4 spaces
              </button>
            </div>
          </div>

          {/* Word wrap */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Word Wrap</span>
              <p className="text-xs text-slate-400">Wrap long lines to fit viewport width</p>
            </div>
            <input
              type="checkbox"
              checked={settings.wordWrap}
              onChange={(e) => onUpdate({ wordWrap: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>

          {/* Minimap */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Code Minimap</span>
              <p className="text-xs text-slate-400">Show overview scrollbar minimap on right</p>
            </div>
            <input
              type="checkbox"
              checked={settings.minimap}
              onChange={(e) => onUpdate({ minimap: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>

          {/* Line numbers */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Line Numbers</span>
              <p className="text-xs text-slate-400">Display gutter line numbers</p>
            </div>
            <input
              type="checkbox"
              checked={settings.lineNumbers}
              onChange={(e) => onUpdate({ lineNumbers: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>

          {/* Bracket matching */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Bracket Matching</span>
              <p className="text-xs text-slate-400">Highlight matching brackets and parentheses</p>
            </div>
            <input
              type="checkbox"
              checked={settings.bracketMatching}
              onChange={(e) => onUpdate({ bracketMatching: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>

          {/* Autocomplete */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Autocomplete & Suggestions</span>
              <p className="text-xs text-slate-400">Auto-suggest as you type and on Ctrl+Space</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autocomplete}
              onChange={(e) => onUpdate({ autocomplete: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>

          {/* Auto-format on run */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Format on Run</span>
              <p className="text-xs text-slate-400">Automatically format code before execution</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoFormatOnRun}
              onChange={(e) => onUpdate({ autoFormatOnRun: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>

          {/* Auto-run examples on selection */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Auto-Run Examples</span>
              <p className="text-xs text-slate-400">Automatically visualize examples when selected from the library</p>
            </div>
            <input
              type="checkbox"
              id="dbv-setting-autorun-examples"
              checked={settings.autoRunExamples ?? true}
              onChange={(e) => onUpdate({ autoRunExamples: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onUpdate(DEFAULT_EDITOR_SETTINGS)}
            className="text-xs text-slate-400 hover:text-indigo-400 transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
