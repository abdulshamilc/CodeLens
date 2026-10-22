// src/tools/dbv/components/layout/LayoutMenu.tsx
// Toolbar dropdown menu for 3-zone layout presets, reset layout, and show/hide per zone

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDBVLayoutStore, LayoutPreset, ZoneId } from "../../store/useDBVLayoutStore";
import { Button } from "../../../../shared/ui";

const PRESET_OPTIONS: Array<{ id: LayoutPreset; label: string; desc: string; icon: string }> = [
  {
    id: "balanced",
    label: "Balanced",
    desc: "Code & Console 38% | Full-height Visualization 62%",
    icon: "⚖️",
  },
  {
    id: "code-focus",
    label: "Code Focus",
    desc: "Expanded editor (72% height) for writing & debugging",
    icon: "📝",
  },
  {
    id: "visual-focus",
    label: "Visual Focus",
    desc: "Expanded stage (72% width) for call stack & memory",
    icon: "👁",
  },
  {
    id: "console-focus",
    label: "Console Focus",
    desc: "Expanded console below editor (55% height) for logs",
    icon: "💻",
  },
];

export function LayoutMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    preset,
    setPreset,
    visibleZones,
    toggleZoneVisibility,
    resetLayout,
    restoreMaximized,
    maximizedZone,
  } = useDBVLayoutStore();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={menuRef}>
      <Button
        size="xs"
        variant={isOpen ? "secondary" : "outline"}
        onClick={() => setIsOpen((v) => !v)}
        className="text-xs flex items-center gap-1.5"
        title="Change 3-zone layout presets and toggle zones"
      >
        <span>🗔</span>
        <span>Layout</span>
        <span className="text-[10px] opacity-75">{isOpen ? "▾" : "▴"}</span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 bottom-full mb-2 w-72 sm:w-80 rounded-2xl border shadow-2xl p-3 z-50 flex flex-col gap-3 font-sans max-h-[calc(100vh-120px)] overflow-y-auto"
            style={{
              background: "rgb(var(--color-panel-surface))",
              borderColor: "rgb(var(--color-panel-border))",
              boxShadow: "0 -12px 35px rgba(0,0,0,0.45)",
            }}
          >
          {/* Header */}
          <div
            className="flex items-center justify-between pb-2 border-b"
            style={{ borderColor: "rgba(var(--color-panel-border), 0.7)" }}
          >
            <span
              className="text-xs font-bold uppercase tracking-wider font-display"
              style={{ color: "rgb(var(--color-text))" }}
            >
              Layout Options
            </span>
            <button
              onClick={() => {
                resetLayout();
                setIsOpen(false);
              }}
              className="text-[11px] font-medium underline hover:no-underline cursor-pointer"
              style={{ color: "rgb(var(--color-accent))" }}
            >
              Reset Layout
            </button>
          </div>

          {/* Maximized Indicator */}
          {maximizedZone && (
            <div
              className="p-2 rounded-xl text-xs flex items-center justify-between"
              style={{
                background: "rgba(var(--color-accent), 0.15)",
                border: "1px solid rgba(var(--color-accent), 0.4)",
              }}
            >
              <span>Zone <strong>{maximizedZone}</strong> is maximized</span>
              <button
                onClick={restoreMaximized}
                className="font-bold underline cursor-pointer"
                style={{ color: "rgb(var(--color-accent))" }}
              >
                Restore
              </button>
            </div>
          )}

          {/* Presets */}
          <div>
            <span
              className="text-[11px] font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: "rgb(var(--color-text-muted))" }}
            >
              Presets
            </span>
            <div className="grid grid-cols-1 gap-1">
              {PRESET_OPTIONS.map((opt) => {
                const isActive = preset === opt.id && !maximizedZone;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setPreset(opt.id);
                      setIsOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer"
                    style={{
                      background: isActive
                        ? "rgba(var(--color-accent), 0.18)"
                        : "rgb(var(--color-panel-surface2))",
                      borderColor: isActive
                        ? "rgb(var(--color-accent))"
                        : "transparent",
                    }}
                  >
                    <span className="text-base shrink-0">{opt.icon}</span>
                    <div className="min-w-0 flex-1">
                      <span
                        className="text-xs font-bold block"
                        style={{
                          color: isActive
                            ? "rgb(var(--color-accent))"
                            : "rgb(var(--color-text))",
                        }}
                      >
                        {opt.label}
                      </span>
                      <span
                        className="text-[10px] leading-tight block truncate opacity-75"
                        style={{ color: "rgb(var(--color-text-muted))" }}
                      >
                        {opt.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Show / Hide Zones */}
          <div
            className="pt-2 border-t"
            style={{ borderColor: "rgba(var(--color-panel-border), 0.7)" }}
          >
            <span
              className="text-[11px] font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: "rgb(var(--color-text-muted))" }}
            >
              Show / Hide Zones
            </span>
            <div className="space-y-1 text-xs">
              {[
                { id: "code" as ZoneId, label: "📝 Code Zone" },
                { id: "visualization" as ZoneId, label: "👁 Visualization Zone" },
                { id: "console" as ZoneId, label: "💻 Console Zone" },
              ].map((zone) => {
                const isChecked = visibleZones[zone.id];
                return (
                  <label
                    key={zone.id}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-700/20 cursor-pointer select-none"
                  >
                    <span style={{ color: "rgb(var(--color-text))" }}>{zone.label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleZoneVisibility(zone.id)}
                      className="cursor-pointer accent-indigo-500 rounded"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
