// src/shared/ui/Button.jsx
// Unified design system button component

import React from "react";
import { motion } from "framer-motion";

/**
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'} [props.variant='secondary']
 * @param {'xs' | 'sm' | 'md' | 'lg'} [props.size='md']
 * @param {React.ReactNode} [props.icon]
 * @param {React.ReactNode} [props.children]
 * @param {string} [props.className]
 * @param {boolean} [props.disabled]
 * @param {React.CSSProperties} [props.style]
 */
export function Button({
  variant = "secondary",
  size = "md",
  icon,
  children,
  className = "",
  disabled = false,
  style,
  ...props
}) {
  const sizeClasses = {
    xs: "px-2 py-1 text-xs gap-1 rounded-md",
    sm: "px-2.5 py-1 text-xs gap-1.5 rounded-lg",
    md: "px-3.5 py-1.5 text-sm gap-2 rounded-xl",
    lg: "px-5 py-2.5 text-base gap-2.5 rounded-2xl",
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          background: "rgb(var(--color-accent))",
          color: "#ffffff",
          boxShadow: "0 2px 10px rgba(var(--color-accent), 0.3)",
        };
      case "secondary":
        return {
          background: "rgb(var(--color-surface2))",
          color: "rgb(var(--color-text))",
          border: "1px solid rgb(var(--color-border))",
        };
      case "outline":
        return {
          background: "transparent",
          color: "rgb(var(--color-text))",
          border: "1px solid rgb(var(--color-border))",
        };
      case "danger":
        return {
          background: "rgba(var(--color-error), 0.15)",
          color: "rgb(var(--color-error))",
          border: "1px solid rgba(var(--color-error), 0.3)",
        };
      case "ghost":
      default:
        return {
          background: "transparent",
          color: "rgb(var(--color-text-muted))",
        };
    }
  };

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium transition-colors select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${sizeClasses[size] || sizeClasses.md} ${className}`}
      style={{
        ...getVariantStyles(),
        ...style,
      }}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </motion.button>
  );
}
