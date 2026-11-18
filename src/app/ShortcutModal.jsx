// src/app/ShortcutModal.tsx
// Global keyboard shortcut help modal (press "?" anywhere to open)
import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "./useAppStore";
const GLOBAL_SHORTCUTS = [
    {
        title: "Main Navigation",
        shortcuts: [
            { keys: ["Ctrl/Alt", "1"], description: "Switch to CodeLens DBV (JS Visualizer)" },
            { keys: ["Ctrl/Alt", "2"], description: "Switch to CodeLens Board (Whiteboard)" },
            { keys: ["Ctrl/Alt", "3"], description: "Switch to CodeLens DSV (Data Structures)" },
            { keys: ["Alt", "D"], description: "Quick jump to DBV" },
            { keys: ["Alt", "B"], description: "Quick jump to Board" },
            { keys: ["Alt", "S"], description: "Quick jump to DSV" },
            { keys: ["?"], description: "Open/close shortcut help" },
            { keys: ["D"], description: "Toggle dark/light theme" },
        ],
    },
    {
        title: "CodeLens Board (Whiteboard)",
        shortcuts: [
            { keys: ["Ctrl", "C"], description: "Copy selected element(s)" },
            { keys: ["Ctrl", "V"], description: "Paste element(s)" },
            { keys: ["Ctrl", "X"], description: "Cut selected element(s)" },
            { keys: ["Ctrl", "D"], description: "Duplicate selected element(s)" },
            { keys: ["Del / ⌫"], description: "Delete selected element(s)" },
            { keys: ["Ctrl", "A"], description: "Select all elements" },
            { keys: ["Ctrl", "Z"], description: "Undo last canvas action" },
            { keys: ["Ctrl", "Y"], description: "Redo last canvas action" },
            { keys: ["S"], description: "Select & Move tool (or V)" },
            { keys: ["H"], description: "Hand / Pan tool" },
            { keys: ["P"], description: "Pencil / Pen freehand drawing" },
            { keys: ["E"], description: "Eraser tool" },
            { keys: ["T"], description: "Text tool (inline editing)" },
            { keys: ["Enter"], description: "Commit & save text" },
            { keys: ["Shift", "Enter"], description: "New line in text" },
            { keys: ["Esc"], description: "Cancel text edit or close modals" },
        ],
    },
    {
        title: "CodeLens Playback (DBV & DSV)",
        shortcuts: [
            { keys: ["Space"], description: "Play / Pause animation" },
            { keys: ["→"], description: "Step forward" },
            { keys: ["←"], description: "Step back" },
            { keys: ["R"], description: "Reset playback to step 0" },
        ],
    },
];
function Kbd({ children }) {
    return (<kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded text-xs font-code font-semibold" style={{
            background: "rgb(var(--color-surface2))",
            border: "1px solid rgb(var(--color-border))",
            color: "rgb(var(--color-text))",
        }}>
      {children}
    </kbd>);
}
export function ShortcutModal() {
    const { shortcutModalOpen, setShortcutModalOpen } = useAppStore();
    // Close on Escape
    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape" && shortcutModalOpen) {
                setShortcutModalOpen(false);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [shortcutModalOpen, setShortcutModalOpen]);
    return (<AnimatePresence>
      {shortcutModalOpen && (<>
          {/* Backdrop */}
          <motion.div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.6)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShortcutModalOpen(false)}/>

          {/* Modal */}
          <motion.div role="dialog" aria-modal="true" aria-labelledby="shortcut-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}>
            <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-6" style={{
                background: "rgb(var(--color-surface))",
                border: "1px solid rgb(var(--color-border))",
            }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 id="shortcut-modal-title" className="font-display text-xl font-bold" style={{ color: "rgb(var(--color-text))" }}>
                  ⌨️ Keyboard Shortcuts
                </h2>
                <button aria-label="Close shortcuts modal" onClick={() => setShortcutModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{
                background: "rgb(var(--color-surface2))",
                color: "rgb(var(--color-text-muted))",
            }}>
                  ✕
                </button>
              </div>

              {/* Groups */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {GLOBAL_SHORTCUTS.map((group) => (<div key={group.title}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "rgb(var(--color-accent))" }}>
                      {group.title}
                    </h3>
                    <div className="space-y-2">
                      {group.shortcuts.map((s) => (<div key={s.description} className="flex items-center justify-between gap-2">
                          <span className="text-sm" style={{ color: "rgb(var(--color-text-muted))" }}>
                            {s.description}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
                          </div>
                        </div>))}
                    </div>
                  </div>))}
              </div>
            </div>
          </motion.div>
        </>)}
    </AnimatePresence>);
}
