// src/tools/dbv/components/panels/PanelWrapper.tsx
// Reusable collapsible panel container for DBV visualization panels

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDBVStore } from "../../store/useDBVStore";

interface PanelWrapperProps {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}

export function PanelWrapper({
  id,
  title,
  children,
  defaultOpen = true,
  badge,
}: PanelWrapperProps) {
  const { panelsVisible, togglePanel } = useDBVStore();
  const isOpen = panelsVisible[id] ?? defaultOpen;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: "1px solid rgba(var(--color-border), 0.6)",
        background: "rgba(var(--color-surface), 0.5)",
      }}
    >
      {/* Header */}
      <button
        id={`panel-header-${id}`}
        onClick={() => togglePanel(id)}
        className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors"
        style={{
          background: "rgba(var(--color-surface2), 0.5)",
          borderBottom: isOpen ? "1px solid rgba(var(--color-border), 0.4)" : "none",
        }}
        aria-expanded={isOpen}
        aria-controls={`panel-body-${id}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: "rgb(var(--color-text))" }}>
            {title}
          </span>
          {badge && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{
                background: "rgba(var(--color-accent), 0.2)",
                color: "rgb(var(--color-accent))",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-xs"
          style={{ color: "rgb(var(--color-text-muted))" }}
        >
          ▼
        </motion.span>
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`panel-body-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
