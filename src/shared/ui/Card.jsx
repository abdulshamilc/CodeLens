// src/shared/ui/Card.jsx
// Unified Card component with semantic borders and surface backgrounds

import React from "react";
import { motion } from "framer-motion";

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.header]
 * @param {React.ReactNode} [props.footer]
 * @param {'default' | 'glass' | 'bordered'} [props.variant='default']
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style]
 */
export function Card({
  children,
  header,
  footer,
  variant = "default",
  className = "",
  style,
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case "glass":
        return {
          background: "rgba(var(--color-surface), 0.75)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(var(--color-border), 0.5)",
        };
      case "bordered":
        return {
          background: "rgb(var(--color-surface))",
          border: "1px solid rgb(var(--color-border))",
        };
      case "default":
      default:
        return {
          background: "rgb(var(--color-surface))",
          border: "1px solid rgb(var(--color-border))",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        };
    }
  };

  return (
    <motion.div
      className={`rounded-2xl flex flex-col overflow-hidden transition-all ${className}`}
      style={{
        ...getVariantStyles(),
        ...style,
      }}
      {...props}
    >
      {header && (
        <div
          className="px-4 py-3 shrink-0 flex items-center justify-between border-b"
          style={{ borderColor: "rgb(var(--color-border))" }}
        >
          {header}
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">{children}</div>
      {footer && (
        <div
          className="px-4 py-2.5 shrink-0 border-t"
          style={{ borderColor: "rgb(var(--color-border))" }}
        >
          {footer}
        </div>
      )}
    </motion.div>
  );
}
