// src/app/ShortcutModal.tsx
// Global keyboard shortcut help modal (press "?" anywhere to open)

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "./useAppStore";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const GLOBAL_SHORTCUTS: ShortcutGroup[] = [
  {
    title: "Global",
    shortcuts: [
      { keys: ["?"], description: "Open/close shortcut help" },
      { keys: ["D"], description: "Toggle dark/light theme" },
      { keys: ["Ctrl", "1"], description: "Go to CodeLens DBV" },
      { keys: ["Ctrl", "2"], description: "Go to CodeLens Board" },
    ],
  },
  {
    title: "CodeLens DBV – Control",
    shortcuts: [
      { keys: ["Ctrl", "Enter"], description: "Run / Analyze code" },
      { keys: ["→"], description: "Step forward" },
      { keys: ["←"], description: "Step back" },
      { keys: ["Space"], description: "Play / Pause" },
      { keys: ["R"], description: "Reset" },
    ],
  },
  {
    title: "CodeLens Board",
    shortcuts: [
      { keys: ["P"], description: "Pencil" },
      { keys: ["B"], description: "Pen" },
      { keys: ["M"], description: "Marker" },
      { keys: ["H"], description: "Highlighter" },
      { keys: ["E"], description: "Eraser" },
      { keys: ["T"], description: "Text" },
      { keys: ["V"], description: "Select / Move" },
      { keys: ["Ctrl", "Z"], description: "Undo" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Redo" },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded text-xs font-code font-semibold"
         style={{
           background: "rgb(var(--color-surface2))",
           border: "1px solid rgb(var(--color-border))",
           color: "rgb(var(--color-text))",
         }}>
      {children}
    </kbd>
  );
}

export function ShortcutModal() {
  const { shortcutModalOpen, setShortcutModalOpen } = useAppStore();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && shortcutModalOpen) {
        setShortcutModalOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcutModalOpen, setShortcutModalOpen]);

  return (
    <AnimatePresence>
      {shortcutModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.6)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShortcutModalOpen(false)}
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcut-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            <div
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-6"
              style={{
                background: "rgb(var(--color-surface))",
                border: "1px solid rgb(var(--color-border))",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 id="shortcut-modal-title" className="font-display text-xl font-bold"
                    style={{ color: "rgb(var(--color-text))" }}>
                  ⌨️ Keyboard Shortcuts
                </h2>
                <button
                  aria-label="Close shortcuts modal"
                  onClick={() => setShortcutModalOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    background: "rgb(var(--color-surface2))",
                    color: "rgb(var(--color-text-muted))",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Groups */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {GLOBAL_SHORTCUTS.map((group) => (
                  <div key={group.title}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3"
                        style={{ color: "rgb(var(--color-accent))" }}>
                      {group.title}
                    </h3>
                    <div className="space-y-2">
                      {group.shortcuts.map((s) => (
                        <div key={s.description} className="flex items-center justify-between gap-2">
                          <span className="text-sm" style={{ color: "rgb(var(--color-text-muted))" }}>
                            {s.description}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
