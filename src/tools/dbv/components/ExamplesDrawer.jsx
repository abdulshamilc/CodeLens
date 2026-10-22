// src/tools/dbv/components/ExamplesDrawer.tsx
// Sidebar drawer listing all example snippets, organized by category
import React, { useState } from "react";
import { motion } from "framer-motion";
import { EXAMPLES } from "../examples/examples.js";
import { useDBVStore } from "../store/useDBVStore";
export function ExamplesDrawer({ onClose }) {
    const { setCode } = useDBVStore();
    const [activeCategory, setActiveCategory] = useState("All");
    const categories = ["All", ...Array.from(new Set(EXAMPLES.map((e) => e.category)))];
    const filtered = activeCategory === "All"
        ? EXAMPLES
        : EXAMPLES.filter((e) => e.category === activeCategory);
    const loadExample = (ex) => {
        setCode(ex.code);
        onClose();
    };
    return (<motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 260, damping: 26 }} className="absolute inset-y-0 right-0 w-72 flex flex-col z-30" style={{
            background: "rgb(var(--color-surface))",
            borderLeft: "1px solid rgb(var(--color-border))",
            boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
        }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 shrink-0" style={{ borderBottom: "1px solid rgb(var(--color-border))" }}>
        <h2 className="font-display font-bold text-sm" style={{ color: "rgb(var(--color-text))" }}>
          📚 Example Library
        </h2>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-xs" style={{ background: "rgb(var(--color-surface2))", color: "rgb(var(--color-text-muted))" }} aria-label="Close examples">
          ✕
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 p-2 flex-wrap shrink-0" style={{ borderBottom: "1px solid rgb(var(--color-border))" }}>
        {categories.map((cat) => (<button key={cat} onClick={() => setActiveCategory(cat)} className="px-2 py-0.5 rounded-md text-xs font-medium transition-colors" style={{
                background: activeCategory === cat
                    ? "rgba(var(--color-accent), 0.2)"
                    : "rgba(var(--color-surface2), 0.5)",
                color: activeCategory === cat
                    ? "rgb(var(--color-accent))"
                    : "rgb(var(--color-text-muted))",
                border: activeCategory === cat
                    ? "1px solid rgba(var(--color-accent), 0.4)"
                    : "1px solid transparent",
            }}>
            {cat}
          </button>))}
      </div>

      {/* Examples list */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {filtered.map((ex) => (<motion.button key={ex.id} onClick={() => loadExample(ex)} whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }} className="text-left p-2.5 rounded-lg transition-colors w-full" style={{
                background: "rgba(var(--color-surface2), 0.4)",
                border: "1px solid rgba(var(--color-border), 0.5)",
            }}>
            <div className="font-semibold text-xs mb-0.5" style={{ color: "rgb(var(--color-text))" }}>
              {ex.title}
            </div>
            <div className="text-[10px] leading-relaxed" style={{ color: "rgb(var(--color-text-muted))" }}>
              {ex.description}
            </div>
            <span className="mt-1 inline-block text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(var(--color-accent), 0.15)", color: "rgb(var(--color-accent))" }}>
              {ex.category}
            </span>
          </motion.button>))}
      </div>
    </motion.div>);
}
