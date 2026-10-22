// src/tools/dbv/components/layout/ResizeHandle.tsx
// Accessible, themed divider with visible grip dots, hover glow, and double-click reset

import React from "react";
import { Separator } from "react-resizable-panels";

interface ResizeHandleProps {
  id?: string;
  direction?: "horizontal" | "vertical"; // horizontal orientation = vertical divider
  onReset?: () => void;
  className?: string;
}

export function ResizeHandle({
  id,
  direction = "horizontal",
  onReset,
  className = "",
}: ResizeHandleProps) {
  const isVerticalDivider = direction === "horizontal";

  return (
    <Separator
      id={id}
      onDoubleClick={onReset}
      className={`group relative flex items-center justify-center transition-all focus:outline-none select-none z-20 touch-none shrink-0 ${
        isVerticalDivider
          ? "w-3 cursor-col-resize py-1"
          : "h-3 cursor-row-resize px-1"
      } ${className}`}
      title="Drag to resize freely, double-click to reset"
    >
      {/* Background divider line with hover/drag highlight */}
      <div
        className={`transition-all rounded-full group-hover:bg-indigo-500 group-focus:bg-indigo-500 ${
          isVerticalDivider
            ? "w-[2px] h-full group-hover:w-[4px]"
            : "h-[2px] w-full group-hover:h-[4px]"
        }`}
        style={{
          background: "rgb(var(--color-panel-border))",
        }}
      />

      {/* Grip dots in the center */}
      <div
        className={`absolute flex items-center justify-center gap-1 rounded-full p-1 pointer-events-none transition-transform group-hover:scale-125 shadow-sm ${
          isVerticalDivider ? "flex-col" : "flex-row"
        }`}
        style={{
          background: "rgb(var(--color-surface2))",
          border: "1px solid rgb(var(--color-panel-border))",
        }}
      >
        <span
          className="w-1 h-1 rounded-full group-hover:bg-indigo-400"
          style={{ background: "rgb(var(--color-text-muted))" }}
        />
        <span
          className="w-1 h-1 rounded-full group-hover:bg-indigo-400"
          style={{ background: "rgb(var(--color-text-muted))" }}
        />
        <span
          className="w-1 h-1 rounded-full group-hover:bg-indigo-400"
          style={{ background: "rgb(var(--color-text-muted))" }}
        />
      </div>
    </Separator>
  );
}
