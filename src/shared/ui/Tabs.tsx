// src/shared/ui/Tabs.tsx
// Unified Tabs component for responsive views and panel switching

import React from "react";
import { motion } from "framer-motion";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeId, onChange, className = "" }: TabsProps) {
  return (
    <div
      role="tablist"
      className={`flex items-center p-1 rounded-xl gap-1 select-none ${className}`}
      style={{
        background: "rgb(var(--color-surface2))",
        border: "1px solid rgb(var(--color-border))",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className="relative px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            style={{
              color: isActive ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))",
            }}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 rounded-lg shadow-sm"
                style={{
                  background: "rgb(var(--color-surface))",
                  border: "1px solid rgb(var(--color-border))",
                }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px]"
                  style={{
                    background: isActive ? "rgba(var(--color-accent), 0.2)" : "rgba(var(--color-surface), 0.8)",
                    color: isActive ? "rgb(var(--color-accent))" : "rgb(var(--color-text-muted))",
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
