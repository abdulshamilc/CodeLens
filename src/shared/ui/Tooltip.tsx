// src/shared/ui/Tooltip.tsx
// Simple, accessible tooltip wrapper

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = "top",
  className = "",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);

  const getPositionClass = () => {
    switch (position) {
      case "bottom":
        return "top-full left-1/2 -translate-x-1/2 mt-1.5";
      case "left":
        return "right-full top-1/2 -translate-y-1/2 mr-1.5";
      case "right":
        return "left-full top-1/2 -translate-y-1/2 ml-1.5";
      case "top":
      default:
        return "bottom-full left-1/2 -translate-x-1/2 mb-1.5";
    }
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && content && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className={`absolute z-50 pointer-events-none px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap shadow-xl border ${getPositionClass()}`}
            style={{
              background: "rgb(var(--color-surface2))",
              color: "rgb(var(--color-text))",
              borderColor: "rgb(var(--color-border))",
            }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
