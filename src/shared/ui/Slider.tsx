// src/shared/ui/Slider.tsx
// Unified Slider component for timeline scrubbing and speed adjustments

import React from "react";

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  className = "",
  disabled = false,
  ariaLabel = "Slider",
}: SliderProps) {
  const percentage = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className={`relative flex items-center w-full select-none ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-transparent disabled:cursor-not-allowed focus:outline-none"
        style={{
          background: `linear-gradient(to right, rgb(var(--color-accent)) ${percentage}%, rgb(var(--color-surface2)) ${percentage}%)`,
        }}
      />
    </div>
  );
}
