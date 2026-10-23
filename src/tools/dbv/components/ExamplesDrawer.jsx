// src/tools/dbv/components/ExamplesDrawer.jsx
// Simplified, streamlined Examples Drawer:
// Clicking an example puts the code directly in the editor, cancels old runners, and auto-visualizes to Step 1.
// No URL mutation, no storage writes, no overwrite dialogs, no seen markers, no undo toast.

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { EXAMPLES, CATEGORIES } from "../examples/index";
import { useDBVStore } from "../store/useDBVStore";

export function ExamplesDrawer({ onClose }) {
  const { loadExample, currentExampleId } = useDBVStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeLevel, setActiveLevel] = useState("All");
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Filtered examples
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EXAMPLES.filter((ex) => {
      // Category filter
      if (activeCategory !== "All" && ex.category !== activeCategory) {
        return false;
      }
      // Level filter
      if (activeLevel !== "All" && ex.level !== activeLevel) {
        return false;
      }
      // Search query
      if (q) {
        const matchesTitle = ex.title.toLowerCase().includes(q);
        const matchesDesc = (ex.description || "").toLowerCase().includes(q);
        const matchesCode = (ex.code || "").toLowerCase().includes(q);
        const matchesTags = (ex.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchesCategory = ex.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCode && !matchesTags && !matchesCategory) {
          return false;
        }
      }
      return true;
    });
  }, [searchQuery, activeCategory, activeLevel]);

  // Adjust focused index when filtered list changes
  useEffect(() => {
    setFocusedIndex(0);
  }, [filtered.length]);

  // Handle direct selection: load and close immediately
  const handleSelectExample = (ex) => {
    loadExample(ex);
    onClose();
  };

  // Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && filtered[focusedIndex]) {
        e.preventDefault();
        handleSelectExample(filtered[focusedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, focusedIndex, onClose]);

  // Scroll active item into view
  const listRef = useRef(null);
  useEffect(() => {
    const el = listRef.current?.children[focusedIndex];
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusedIndex]);

  const levelBadges = {
    beginner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    intermediate: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    advanced: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  };

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0.5 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute inset-y-0 right-0 w-84 sm:w-96 flex flex-col z-40 backdrop-blur-md shadow-2xl"
      style={{
        background: "rgba(var(--color-surface), 0.96)",
        borderLeft: "1px solid rgba(var(--color-border), 0.8)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="p-3.5 flex items-center justify-between border-b shrink-0"
        style={{ borderColor: "rgba(var(--color-border), 0.8)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📚</span>
          <div>
            <h2
              className="font-display font-bold text-sm tracking-tight"
              style={{ color: "rgb(var(--color-text))" }}
            >
              Interactive Examples
            </h2>
            <div className="text-[11px]" style={{ color: "rgb(var(--color-text-muted))" }}>
              {EXAMPLES.length} curated JavaScript lessons
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs hover:bg-slate-700/40 transition-colors cursor-pointer"
          style={{
            background: "rgba(var(--color-surface2), 0.7)",
            color: "rgb(var(--color-text-muted))",
          }}
          aria-label="Close examples (Esc)"
          title="Close (Esc)"
        >
          ✕
        </button>
      </div>

      {/* ── Search bar ── */}
      <div className="p-3 border-b shrink-0" style={{ borderColor: "rgba(var(--color-border), 0.5)" }}>
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs"
          style={{
            background: "rgba(var(--color-surface2), 0.6)",
            borderColor: "rgba(var(--color-border), 0.7)",
          }}
        >
          <span className="opacity-60 text-xs">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, tag, description, or code..."
            className="bg-transparent border-none outline-none flex-1 text-xs"
            style={{ color: "rgb(var(--color-text))" }}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-[10px] opacity-60 hover:opacity-100 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Level Filter Pills ── */}
      <div
        className="px-3 py-1.5 flex items-center gap-1.5 shrink-0 border-b overflow-x-auto text-xs"
        style={{ borderColor: "rgba(var(--color-border), 0.4)" }}
      >
        <span className="text-[10px] uppercase font-mono tracking-wider opacity-60 mr-1">Level:</span>
        {["All", "beginner", "intermediate", "advanced"].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setActiveLevel(lvl)}
            className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              activeLevel === lvl
                ? "bg-slate-700 text-white shadow-sm border border-slate-600"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Category Chips ── */}
      <div
        className="p-2 flex gap-1 flex-wrap shrink-0 border-b max-h-24 overflow-y-auto"
        style={{ borderColor: "rgba(var(--color-border), 0.4)" }}
      >
        {["All", ...CATEGORIES].map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
              style={{
                background: isActive
                  ? "rgba(var(--color-accent), 0.22)"
                  : "rgba(var(--color-surface2), 0.45)",
                color: isActive
                  ? "rgb(var(--color-accent))"
                  : "rgb(var(--color-text-muted))",
                border: isActive
                  ? "1px solid rgba(var(--color-accent), 0.5)"
                  : "1px solid transparent",
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── Examples List ── */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2"
        role="listbox"
      >
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs opacity-60">
            No matching examples found. Try a different search query or filter.
          </div>
        ) : (
          filtered.map((ex, idx) => {
            const isLoaded = currentExampleId === ex.id;
            const isFocused = focusedIndex === idx;

            return (
              <motion.div
                key={ex.id}
                role="option"
                aria-selected={isLoaded}
                onClick={() => handleSelectExample(ex)}
                onMouseEnter={() => setFocusedIndex(idx)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`p-3 rounded-xl cursor-pointer text-left transition-all border relative ${
                  isLoaded
                    ? "ring-1 ring-indigo-500/50 bg-indigo-950/20"
                    : isFocused
                    ? "bg-slate-800/40 border-slate-600/70"
                    : "bg-slate-900/30 border-slate-800/60 hover:border-slate-700/80"
                }`}
                style={{
                  borderColor: isLoaded ? "rgba(var(--color-accent), 0.6)" : undefined,
                }}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div
                    className="font-semibold text-xs leading-snug flex-1"
                    style={{ color: "rgb(var(--color-text))" }}
                  >
                    {ex.title}
                  </div>
                </div>

                {/* Description */}
                <p
                  className="text-[11px] leading-relaxed line-clamp-2 mb-2"
                  style={{ color: "rgb(var(--color-text-muted))" }}
                >
                  {ex.description}
                </p>

                {/* Badges row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[9.5px] px-1.5 py-0.2 rounded border font-mono uppercase font-semibold ${
                      levelBadges[ex.level] || levelBadges.beginner
                    }`}
                  >
                    {ex.level}
                  </span>
                  <span
                    className="text-[9.5px] px-1.5 py-0.2 rounded border border-slate-700/60 bg-slate-800/40 text-slate-300 font-mono"
                  >
                    {ex.category}
                  </span>
                  {ex.focus && (
                    <span
                      className="text-[9.5px] px-1.5 py-0.2 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-mono"
                    >
                      Focus: {ex.focus}
                    </span>
                  )}
                  {isLoaded && (
                    <span
                      className="ml-auto text-[9.5px] px-1.5 py-0.2 rounded-full bg-indigo-500 text-white font-bold tracking-wider uppercase font-mono"
                    >
                      Active
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
