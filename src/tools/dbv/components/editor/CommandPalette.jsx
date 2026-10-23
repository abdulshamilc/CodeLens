// src/tools/dbv/components/editor/CommandPalette.jsx
// VS Code-style Command Palette (F1 / Ctrl+Shift+P)
// Fast keyboard navigation, fuzzy search, categories, and direct action triggers.

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function CommandPalette({ isOpen, onClose, commands = [] }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) => {
      return (
        cmd.label.toLowerCase().includes(q) ||
        (cmd.category && cmd.category.toLowerCase().includes(q)) ||
        (cmd.shortcut && cmd.shortcut.toLowerCase().includes(q))
      );
    });
  }, [query, commands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredCommands.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCommands.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = filteredCommands[selectedIndex];
      if (chosen) {
        onClose();
        chosen.action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden flex flex-col font-sans"
          style={{
            background: "rgb(var(--color-surface, 30, 41, 59))",
            borderColor: "rgb(var(--color-border, 71, 85, 105))",
            color: "rgb(var(--color-text, 241, 245, 249))",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search bar input */}
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 border-b"
            style={{ borderColor: "rgb(var(--color-border, 71, 85, 105))" }}
          >
            <span className="text-slate-400 font-mono text-sm">›</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search actions..."
              className="flex-1 bg-transparent border-none outline-none text-sm font-sans"
              style={{ color: "rgb(var(--color-text, 241, 245, 249))" }}
            />
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-700 text-slate-400">
              ESC
            </span>
          </div>

          {/* Commands list */}
          <div
            ref={listRef}
            className="max-h-80 overflow-y-auto p-1.5 space-y-0.5"
          >
            {filteredCommands.length > 0 ? (
              filteredCommands.map((cmd, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={cmd.id || idx}
                    type="button"
                    onClick={() => {
                      onClose();
                      cmd.action();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left cursor-pointer transition-colors ${
                      isSelected ? "bg-indigo-600/30 text-white" : "hover:bg-slate-700/20"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {cmd.category && (
                        <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-700/30 text-slate-400">
                          {cmd.category}
                        </span>
                      )}
                      <span className="font-medium truncate">{cmd.label}</span>
                    </div>

                    {cmd.shortcut && (
                      <span className="text-[10px] font-mono opacity-60 ml-3 shrink-0">
                        {cmd.shortcut}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No matching commands found.
              </div>
            )}
          </div>

          {/* Footer keyboard guide */}
          <div
            className="px-3 py-1.5 border-t text-[11px] text-slate-400 flex items-center justify-between bg-slate-900/30"
            style={{ borderColor: "rgb(var(--color-border, 71, 85, 105))" }}
          >
            <div className="flex items-center gap-3">
              <span>↑↓ Navigate</span>
              <span>↵ Execute</span>
              <span>ESC Close</span>
            </div>
            <span className="text-[10px] font-mono">CodeLens DBV</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
